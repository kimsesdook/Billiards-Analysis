package com.my.billiards.common.observability;

import static org.assertj.core.api.Assertions.assertThat;

import com.my.billiards.game.domain.GameType;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class BusinessMetricsTest {

	@Test
	void recordsOnlyLowCardinalityBusinessOutcomes() {
		SimpleMeterRegistry registry = new SimpleMeterRegistry();
		BusinessMetrics metrics = new BusinessMetrics(registry);

		metrics.recordLoginSuccess();
		metrics.recordLoginFailure();
		metrics.recordRateLimitRejection("login-account");
		metrics.recordAiReport("cache_hit", GameType.THREE_CUSHION);

		assertThat(registry.get("billiards.authentication.login.attempts")
			.tag("outcome", "success").counter().count()).isEqualTo(1);
		assertThat(registry.get("billiards.authentication.login.attempts")
			.tag("outcome", "failure").counter().count()).isEqualTo(1);
		assertThat(registry.get("billiards.rate.limit.rejections")
			.tag("scope", "login-account").counter().count()).isEqualTo(1);
		assertThat(registry.get("billiards.ai.report.requests")
			.tag("outcome", "cache_hit")
			.tag("game_type", "three_cushion")
			.counter().count()).isEqualTo(1);
	}
}
