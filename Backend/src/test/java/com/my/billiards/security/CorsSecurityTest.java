package com.my.billiards.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CorsSecurityTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void allowsPreflightRequestFromConfiguredFrontend() throws Exception {
		mockMvc.perform(options("/api/game-records")
				.header(HttpHeaders.ORIGIN, "http://localhost:3000")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"))
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
	}

	@Test
	void rejectsPreflightRequestFromUnknownOrigin() throws Exception {
		mockMvc.perform(options("/api/game-records")
				.header(HttpHeaders.ORIGIN, "https://untrusted.example")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(status().isForbidden())
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}
}
