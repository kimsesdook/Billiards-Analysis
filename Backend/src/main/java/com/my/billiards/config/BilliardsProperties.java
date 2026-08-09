package com.my.billiards.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class BilliardsProperties {

	private final Cors cors = new Cors();
	private final Jwt jwt = new Jwt();
	private final AdminBootstrap adminBootstrap = new AdminBootstrap();

	public Cors getCors() {
		return cors;
	}

	public Jwt getJwt() {
		return jwt;
	}

	public AdminBootstrap getAdminBootstrap() {
		return adminBootstrap;
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
		private long refreshTokenExpirationDays = 30;
		private boolean refreshCookieSecure;

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

		public long getRefreshTokenExpirationDays() {
			return refreshTokenExpirationDays;
		}

		public void setRefreshTokenExpirationDays(long refreshTokenExpirationDays) {
			this.refreshTokenExpirationDays = refreshTokenExpirationDays;
		}

		public boolean isRefreshCookieSecure() {
			return refreshCookieSecure;
		}

		public void setRefreshCookieSecure(boolean refreshCookieSecure) {
			this.refreshCookieSecure = refreshCookieSecure;
		}

	}

	public static class AdminBootstrap {

		private boolean enabled;
		private String email = "";

		public boolean isEnabled() {
			return enabled;
		}

		public void setEnabled(boolean enabled) {
			this.enabled = enabled;
		}

		public String getEmail() {
			return email;
		}

		public void setEmail(String email) {
			this.email = email;
		}
	}
}
