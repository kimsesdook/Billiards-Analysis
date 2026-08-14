package com.my.billiards.ai.lock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;

class RedisAiReportLockStoreTest {

	@Test
	void createsStoreOutsideTheTestProfile() {
		new ApplicationContextRunner()
			.withInitializer(context -> context.getEnvironment().setActiveProfiles("docker"))
			.withBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class))
			.withUserConfiguration(RedisAiReportLockStore.class)
			.run(context -> assertThat(context).hasSingleBean(RedisAiReportLockStore.class));
	}

	@Test
	@SuppressWarnings("unchecked")
	void acquiresAnExpiringLockWithAHashedRedisKey() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
		when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		when(valueOperations.setIfAbsent(anyString(), anyString(), eq(Duration.ofMinutes(3))))
			.thenReturn(true);
		RedisAiReportLockStore store = new RedisAiReportLockStore(redisTemplate);

		Optional<AiReportLockLease> lease = store.tryAcquire(
			"7:THREE_CUSHION:2026-08-14",
			Duration.ofMinutes(3)
		);

		assertThat(lease).isPresent();
		ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
		verify(valueOperations).setIfAbsent(
			keyCaptor.capture(),
			eq(lease.orElseThrow().ownerToken()),
			eq(Duration.ofMinutes(3))
		);
		assertThat(keyCaptor.getValue())
			.startsWith("billiards:ai-report-lock:")
			.matches("billiards:ai-report-lock:[0-9a-f]{64}")
			.doesNotContain("THREE_CUSHION", "2026-08-14");
	}

	@Test
	@SuppressWarnings("unchecked")
	void reportsContentionWhenAnotherOwnerAlreadyHoldsTheLock() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
		when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(false);

		Optional<AiReportLockLease> lease = new RedisAiReportLockStore(redisTemplate)
			.tryAcquire("same-report", Duration.ofMinutes(3));

		assertThat(lease).isEmpty();
	}

	@Test
	@SuppressWarnings({"unchecked", "rawtypes"})
	void releasesOnlyThroughTheOwnerCheckedLuaScript() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		RedisAiReportLockStore store = new RedisAiReportLockStore(redisTemplate);
		AiReportLockLease lease = new AiReportLockLease("private-report-identity", "owner-token");

		store.release(lease);

		ArgumentCaptor<DefaultRedisScript> scriptCaptor = ArgumentCaptor.forClass(DefaultRedisScript.class);
		ArgumentCaptor<List<String>> keysCaptor = ArgumentCaptor.forClass(List.class);
		verify(redisTemplate).execute(scriptCaptor.capture(), keysCaptor.capture(), eq("owner-token"));
		assertThat(scriptCaptor.getValue().getScriptAsString())
			.contains("GET", "ARGV[1]", "DEL");
		assertThat(keysCaptor.getValue()).singleElement().asString()
			.startsWith("billiards:ai-report-lock:")
			.doesNotContain("private-report-identity");
	}

	@Test
	@SuppressWarnings("unchecked")
	void failsClosedWhenRedisCannotAcquireTheLock() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
		when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class)))
			.thenThrow(new QueryTimeoutException("redis timeout"));

		assertThatThrownBy(() -> new RedisAiReportLockStore(redisTemplate)
			.tryAcquire("same-report", Duration.ofMinutes(3)))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.AI_COORDINATION_UNAVAILABLE);
	}

	@Test
	void letsExpirationRecoverAReleaseFailure() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		when(redisTemplate.execute(any(DefaultRedisScript.class), any(List.class), any()))
			.thenThrow(new QueryTimeoutException("redis timeout"));
		RedisAiReportLockStore store = new RedisAiReportLockStore(redisTemplate);

		assertThatCode(() -> store.release(new AiReportLockLease("same-report", "owner-token")))
			.doesNotThrowAnyException();
	}
}
