package com.my.billiards.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

class RedisRateLimitStoreTest {

	@Test
	void createsStoreInDockerProfile() {
		try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
			context.getEnvironment().setActiveProfiles("docker");
			context.registerBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class));
			context.register(RedisRateLimitStore.class);
			context.refresh();

			assertThat(context.getBean(RedisRateLimitStore.class)).isNotNull();
		}
	}

	@Test
	@SuppressWarnings({ "rawtypes", "unchecked" })
	void mapsAtomicRedisScriptResult() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		when(redisTemplate.execute(
			any(RedisScript.class),
			eq(List.of("rate-limit-key")),
			eq("60000")
		)).thenReturn(List.of(4L, 29500L));
		RedisRateLimitStore store = new RedisRateLimitStore(redisTemplate);

		RateLimitResult result = store.increment("rate-limit-key", Duration.ofSeconds(60));

		assertThat(result.requestCount()).isEqualTo(4);
		assertThat(result.retryAfterSeconds()).isEqualTo(30);
	}
}
