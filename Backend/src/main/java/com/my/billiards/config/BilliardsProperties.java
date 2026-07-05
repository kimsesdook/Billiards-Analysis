package com.my.billiards.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class BilliardsProperties {

	private final Cors cors = new Cors();

	public Cors getCors() {
		return cors;
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
}
