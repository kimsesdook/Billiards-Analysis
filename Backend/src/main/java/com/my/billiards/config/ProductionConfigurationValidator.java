package com.my.billiards.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class ProductionConfigurationValidator implements InitializingBean {

	private static final int MINIMUM_JWT_SECRET_BYTES = 32;
	private static final int MINIMUM_INFRASTRUCTURE_SECRET_CHARACTERS = 16;
	private static final Set<String> INCOMPATIBLE_PROFILES = Set.of("local", "docker", "test");
	private static final Set<String> WEAK_SECRET_VALUES = Set.of(
		"billiards",
		"password",
		"root",
		"secret",
		"change-me"
	);

	private final BilliardsProperties properties;
	private final Environment environment;

	@Override
	public void afterPropertiesSet() {
		Set<String> violations = new LinkedHashSet<>();

		validateProfiles(violations);
		validateJwt(violations);
		validateCors(violations);
		validateDatabase(violations);
		validateRedis(violations);
		validateActuatorExposure(violations);

		if (!violations.isEmpty()) {
			throw new IllegalStateException(
				"Invalid production configuration. Check: " + String.join(", ", violations)
			);
		}
	}

	private void validateProfiles(Set<String> violations) {
		boolean incompatibleProfileActive = Arrays.stream(environment.getActiveProfiles())
			.anyMatch(INCOMPATIBLE_PROFILES::contains);
		if (incompatibleProfileActive) {
			violations.add("spring.profiles.active");
		}
	}

	private void validateJwt(Set<String> violations) {
		String jwtSecret = properties.getJwt().getSecret();
		if (!isStrongSecret(jwtSecret, MINIMUM_JWT_SECRET_BYTES)) {
			violations.add("app.jwt.secret");
		}
		if (!properties.getJwt().isRefreshCookieSecure()) {
			violations.add("app.jwt.refresh-cookie-secure");
		}
		if (properties.getAdminBootstrap().isEnabled()) {
			violations.add("app.admin-bootstrap.enabled");
		}
	}

	private void validateCors(Set<String> violations) {
		List<String> allowedOrigins = properties.getCors().getAllowedOrigins();
		if (allowedOrigins == null || allowedOrigins.isEmpty() || allowedOrigins.stream().anyMatch(
			origin -> !isSecureOrigin(origin)
		)) {
			violations.add("app.cors.allowed-origins");
		}
	}

	private void validateDatabase(Set<String> violations) {
		String databaseUrl = environment.getProperty("spring.datasource.url");
		if (!hasText(databaseUrl)
			|| !databaseUrl.toLowerCase(Locale.ROOT).startsWith("jdbc:mysql:")
			|| !databaseUrl.toLowerCase(Locale.ROOT).contains("sslmode=verify_identity")) {
			violations.add("spring.datasource.url");
		}
		if (!hasText(environment.getProperty("spring.datasource.username"))) {
			violations.add("spring.datasource.username");
		}
		if (!isStrongSecret(
			environment.getProperty("spring.datasource.password"),
			MINIMUM_INFRASTRUCTURE_SECRET_CHARACTERS
		)) {
			violations.add("spring.datasource.password");
		}
	}

	private void validateRedis(Set<String> violations) {
		if (!hasText(environment.getProperty("spring.data.redis.host"))) {
			violations.add("spring.data.redis.host");
		}
		if (!isStrongSecret(
			environment.getProperty("spring.data.redis.password"),
			MINIMUM_INFRASTRUCTURE_SECRET_CHARACTERS
		)) {
			violations.add("spring.data.redis.password");
		}
		if (!environment.getProperty("spring.data.redis.ssl.enabled", Boolean.class, false)) {
			violations.add("spring.data.redis.ssl.enabled");
		}
	}

	private void validateActuatorExposure(Set<String> violations) {
		String exposure = environment.getProperty("management.endpoints.web.exposure.include", "");
		Set<String> exposedEndpoints = new LinkedHashSet<>(Arrays.stream(exposure.split(","))
			.map(String::trim)
			.filter(value -> !value.isEmpty())
			.toList());
		if (!exposedEndpoints.equals(Set.of("health", "info"))) {
			violations.add("management.endpoints.web.exposure.include");
		}
	}

	private boolean isStrongSecret(String value, int minimumLength) {
		if (!hasText(value) || value.getBytes(StandardCharsets.UTF_8).length < minimumLength) {
			return false;
		}
		String normalizedValue = value.trim().toLowerCase(Locale.ROOT);
		return WEAK_SECRET_VALUES.stream().noneMatch(weakValue ->
			normalizedValue.equals(weakValue) || normalizedValue.contains(weakValue + "-")
		);
	}

	private boolean isSecureOrigin(String origin) {
		if (!hasText(origin) || origin.contains("*")) {
			return false;
		}
		try {
			URI uri = URI.create(origin);
			String host = uri.getHost();
			return "https".equalsIgnoreCase(uri.getScheme())
				&& hasText(host)
				&& !"localhost".equalsIgnoreCase(host)
				&& !"127.0.0.1".equals(host)
				&& !"::1".equals(host)
				&& uri.getUserInfo() == null
				&& uri.getQuery() == null
				&& uri.getFragment() == null
				&& (uri.getPath().isEmpty() || "/".equals(uri.getPath()));
		} catch (IllegalArgumentException exception) {
			return false;
		}
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}

