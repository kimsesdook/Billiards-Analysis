package com.my.billiards.common.logging;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RequestIdFilterTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void returnsValidCallerRequestId() throws Exception {
		mockMvc.perform(get("/actuator/health")
				.header(RequestIdFilter.HEADER_NAME, "gateway-request-001"))
			.andExpect(status().isOk())
			.andExpect(header().string(RequestIdFilter.HEADER_NAME, "gateway-request-001"));
	}

	@Test
	void addsRequestIdToAuthenticationFailureResponse() throws Exception {
		mockMvc.perform(get("/api/game-records")
				.header(RequestIdFilter.HEADER_NAME, "client-request-002"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string(RequestIdFilter.HEADER_NAME, "client-request-002"));
	}

	@Test
	void generatesRequestIdWhenClientDoesNotProvideOne() throws Exception {
		MvcResult result = mockMvc.perform(get("/actuator/health"))
			.andExpect(status().isOk())
			.andExpect(header().exists(RequestIdFilter.HEADER_NAME))
			.andReturn();

		String requestId = result.getResponse().getHeader(RequestIdFilter.HEADER_NAME);
		assertThat(requestId).isNotBlank();
		UUID.fromString(requestId);
	}
}
