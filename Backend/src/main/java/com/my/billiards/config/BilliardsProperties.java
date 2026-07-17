package com.my.billiards.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class BilliardsProperties {

	private final Cors cors = new Cors();
	private final Jwt jwt = new Jwt();

	public Cors getCors() {
		return cors;
	}

	public Jwt getJwt() {
		return jwt;
	}

	public static class Cors {

		private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:3000"));

		public List<String> getAllowedOrigins() {
			return allowedOrigins;
		}

		public void setAllowedOrigins(List<String> allowedOrigins) {
			this.allowedOrigins = allowedOrigins;
		}
	}

	public static class Jwt {

		private String secret = "local-development-jwt-secret-change-me-please-32bytes";
		private long accessTokenExpirationMinutes = 60;

		public String getSecret() {
			return secret;
		}

		public void setSecret(String secret) {
			this.secret = secret;
		}

		public long getAccessTokenExpirationMinutes() {
			return accessTokenExpirationMinutes;
		}

		public void setAccessTokenExpirationMinutes(long accessTokenExpirationMinutes) {
			this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
		}
	}
}
