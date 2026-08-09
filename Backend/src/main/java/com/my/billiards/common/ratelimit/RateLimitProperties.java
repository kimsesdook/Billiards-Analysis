package com.my.billiards.common.ratelimit;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app.rate-limit")
@Validated
public class RateLimitProperties {

	@Min(1)
	private int loginAccountMaxRequests = 5;
	@Min(1)
	private int loginAddressMaxRequests = 30;
	@Min(1)
	private long loginWindowSeconds = 300;
	@Min(1)
	private int webSocketTicketMaxRequests = 30;
	@Min(1)
	private long webSocketTicketWindowSeconds = 60;
	@Min(1)
	private int aiGenerationMaxRequests = 3;
	@Min(1)
	private long aiGenerationWindowSeconds = 86400;

	public int getLoginAccountMaxRequests() {
		return loginAccountMaxRequests;
	}

	public void setLoginAccountMaxRequests(int loginAccountMaxRequests) {
		this.loginAccountMaxRequests = loginAccountMaxRequests;
	}

	public int getLoginAddressMaxRequests() {
		return loginAddressMaxRequests;
	}

	public void setLoginAddressMaxRequests(int loginAddressMaxRequests) {
		this.loginAddressMaxRequests = loginAddressMaxRequests;
	}

	public long getLoginWindowSeconds() {
		return loginWindowSeconds;
	}

	public void setLoginWindowSeconds(long loginWindowSeconds) {
		this.loginWindowSeconds = loginWindowSeconds;
	}

	public int getWebSocketTicketMaxRequests() {
		return webSocketTicketMaxRequests;
	}

	public void setWebSocketTicketMaxRequests(int webSocketTicketMaxRequests) {
		this.webSocketTicketMaxRequests = webSocketTicketMaxRequests;
	}

	public long getWebSocketTicketWindowSeconds() {
		return webSocketTicketWindowSeconds;
	}

	public void setWebSocketTicketWindowSeconds(long webSocketTicketWindowSeconds) {
		this.webSocketTicketWindowSeconds = webSocketTicketWindowSeconds;
	}

	public int getAiGenerationMaxRequests() {
		return aiGenerationMaxRequests;
	}

	public void setAiGenerationMaxRequests(int aiGenerationMaxRequests) {
		this.aiGenerationMaxRequests = aiGenerationMaxRequests;
	}

	public long getAiGenerationWindowSeconds() {
		return aiGenerationWindowSeconds;
	}

	public void setAiGenerationWindowSeconds(long aiGenerationWindowSeconds) {
		this.aiGenerationWindowSeconds = aiGenerationWindowSeconds;
	}
}
