package com.my.billiards.common.observability;

import com.my.billiards.game.domain.GameType;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BusinessMetrics {

	private static final String LOGIN_ATTEMPTS = "billiards.authentication.login.attempts";
	private static final String RATE_LIMIT_REJECTIONS = "billiards.rate.limit.rejections";
	private static final String AI_REPORT_REQUESTS = "billiards.ai.report.requests";

	private final MeterRegistry meterRegistry;

	public void recordLoginSuccess() {
		counter(LOGIN_ATTEMPTS, "Login attempts by outcome.", "outcome", "success").increment();
	}

	public void recordLoginFailure() {
		counter(LOGIN_ATTEMPTS, "Login attempts by outcome.", "outcome", "failure").increment();
	}

	public void recordRateLimitRejection(String scope) {
		counter(RATE_LIMIT_REJECTIONS, "Rejected requests by rate-limit scope.", "scope", scope).increment();
	}

	public void recordAiReport(String outcome, GameType gameType) {
		Counter.builder(AI_REPORT_REQUESTS)
			.description("AI report requests by outcome and game type.")
			.tag("outcome", outcome)
			.tag("game_type", gameType.name().toLowerCase(Locale.ROOT))
			.register(meterRegistry)
			.increment();
	}

	private Counter counter(String name, String description, String tagName, String tagValue) {
		return Counter.builder(name)
			.description(description)
			.tag(tagName, tagValue)
			.register(meterRegistry);
	}
}
