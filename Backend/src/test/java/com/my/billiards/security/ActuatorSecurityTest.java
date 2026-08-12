package com.my.billiards.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ActuatorSecurityTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void exposesHealthWithoutAuthentication() throws Exception {
		mockMvc.perform(get("/actuator/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void exposesLivenessAndReadinessWithoutAuthentication() throws Exception {
		mockMvc.perform(get("/actuator/health/liveness"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
		mockMvc.perform(get("/actuator/health/readiness"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void rejectsMetricsWithoutAuthentication() throws Exception {
		mockMvc.perform(get("/actuator/metrics"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void rejectsMetricsForRegularUser() throws Exception {
		mockMvc.perform(get("/actuator/metrics")
				.with(user("user").roles("USER")))
			.andExpect(status().isForbidden());
	}

	@Test
	void exposesMetricsForAdmin() throws Exception {
		mockMvc.perform(get("/actuator/metrics")
				.with(user("admin").roles("ADMIN")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.names").isArray());
	}

	@Test
	void protectsPrometheusFromRegularUsersAndExposesItToAdmins() throws Exception {
		mockMvc.perform(get("/actuator/prometheus")
				.with(user("user").roles("USER")))
			.andExpect(status().isForbidden());

		mockMvc.perform(get("/actuator/prometheus")
				.with(user("admin").roles("ADMIN")))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("billiards_websocket_connections_active")));
	}
}
