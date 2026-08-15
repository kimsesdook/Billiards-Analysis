package com.my.billiards.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class ProductionConfigurationValidatorTest {

	private BilliardsProperties properties;
	private MockEnvironment environment;
	private ProductionConfigurationValidator validator;

	@BeforeEach
	void setUp() {
		properties = new BilliardsProperties();
		properties.getJwt().setSecret("K9m4Q2v8R7x1T6n3P5s0W4y8Z2a6C9f1H7j3L5q8");
		properties.getJwt().setRefreshCookieSecure(true);
		properties.getCors().setAllowedOrigins(List.of("https://billiards.example.com"));

		environment = new MockEnvironment();
		environment.setActiveProfiles("prod");
		environment.setProperty(
			"spring.datasource.url",
			"jdbc:mysql://db.example.com:3306/billiards?sslMode=VERIFY_IDENTITY"
		);
		environment.setProperty("spring.datasource.username", "billiards_app");
		environment.setProperty("spring.datasource.password", "strong-database-password");
		environment.setProperty("spring.data.redis.host", "redis.example.com");
		environment.setProperty("spring.data.redis.password", "strong-redis-password");
		environment.setProperty("spring.data.redis.ssl.enabled", "true");
		environment.setProperty("management.endpoints.web.exposure.include", "health,info");

		validator = new ProductionConfigurationValidator(properties, environment);
	}

	@Test
	void acceptsSecureProductionConfiguration() {
		assertThatCode(validator::afterPropertiesSet).doesNotThrowAnyException();
	}

	@Test
	void rejectsWeakJwtAndUnsafeWebConfigurationWithoutExposingTheSecret() {
		String weakSecret = "weak-secret";
		properties.getJwt().setSecret(weakSecret);
		properties.getJwt().setRefreshCookieSecure(false);
		properties.getAdminBootstrap().setEnabled(true);
		properties.getCors().setAllowedOrigins(List.of("http://localhost:3000"));

		assertThatThrownBy(validator::afterPropertiesSet)
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("app.jwt.secret")
			.hasMessageContaining("app.jwt.refresh-cookie-secure")
			.hasMessageContaining("app.admin-bootstrap.enabled")
			.hasMessageContaining("app.cors.allowed-origins")
			.hasMessageNotContaining(weakSecret);
	}

	@Test
	void rejectsInsecureInfrastructureConfiguration() {
		environment.setActiveProfiles("prod", "local");
		environment.setProperty(
			"spring.datasource.url",
			"jdbc:mysql://localhost:3306/billiards?useSSL=false"
		);
		environment.setProperty("spring.datasource.password", "billiards");
		environment.setProperty("spring.data.redis.host", "");
		environment.setProperty("spring.data.redis.password", "password");
		environment.setProperty("spring.data.redis.ssl.enabled", "false");

		assertThatThrownBy(validator::afterPropertiesSet)
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("spring.profiles.active")
			.hasMessageContaining("spring.datasource.url")
			.hasMessageContaining("spring.datasource.password")
			.hasMessageContaining("spring.data.redis.host")
			.hasMessageContaining("spring.data.redis.password")
			.hasMessageContaining("spring.data.redis.ssl.enabled");
	}

	@Test
	void rejectsAdditionalActuatorEndpoints() {
		environment.setProperty("management.endpoints.web.exposure.include", "health,info,prometheus");

		assertThatThrownBy(validator::afterPropertiesSet)
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("management.endpoints.web.exposure.include");
	}
}
