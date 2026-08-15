package com.my.billiards.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

class ProductionProfileConfigurationTest {

	private PropertySource<?> productionProperties;

	@BeforeEach
	void loadProductionProfile() throws IOException {
		productionProperties = new YamlPropertySourceLoader()
			.load("production", new ClassPathResource("application-prod.yaml"))
			.get(0);
	}

	@Test
	void requiresProductionSecretsAndEndpointsFromEnvironmentVariables() {
		assertThat(property("spring.datasource.url")).isEqualTo("${DB_URL}");
		assertThat(property("spring.datasource.username")).isEqualTo("${DB_USERNAME}");
		assertThat(property("spring.datasource.password")).isEqualTo("${DB_PASSWORD}");
		assertThat(property("spring.data.redis.host")).isEqualTo("${REDIS_HOST}");
		assertThat(property("spring.data.redis.password")).isEqualTo("${REDIS_PASSWORD}");
		assertThat(property("app.jwt.secret")).isEqualTo("${JWT_SECRET}");
		assertThat(property("app.cors.allowed-origins[0]")).isEqualTo("${FRONTEND_URL}");
	}

	@Test
	void keepsProductionWebAndDiagnosticsSettingsRestricted() {
		assertThat(property("app.jwt.refresh-cookie-secure")).isEqualTo(true);
		assertThat(property("app.admin-bootstrap.enabled")).isEqualTo(false);
		assertThat(property("spring.jpa.show-sql")).isEqualTo(false);
		assertThat(property("server.shutdown")).isEqualTo("graceful");
		assertThat(property("server.forward-headers-strategy")).isEqualTo("framework");
		assertThat(property("server.error.include-stacktrace")).isEqualTo("never");
		assertThat(property("management.endpoints.web.exposure.include")).isEqualTo("health,info");
	}

	private Object property(String name) {
		return productionProperties.getProperty(name);
	}
}

