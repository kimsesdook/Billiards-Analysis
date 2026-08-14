package com.my.billiards.ai.config;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.ai-report")
@Validated
public class AiReportProperties {

	private String modelName;

	@Min(1)
	private long lockTtlSeconds = 180;

	@Min(0)
	private long lockWaitSeconds = 5;

	@Min(10)
	private long lockPollIntervalMillis = 100;
}
