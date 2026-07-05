package com.my.billiards.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

	private final BilliardsProperties properties;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
			.allowedOrigins(properties.getCors().getAllowedOrigins().toArray(new String[0]))
			.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
			.allowedHeaders("*")
			.allowCredentials(true)
			.maxAge(3600);
	}
}
