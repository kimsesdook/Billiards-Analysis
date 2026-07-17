package com.my.billiards.auth.controller;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void setUp() {
		memberRepository.deleteAll();
	}

	@Test
	void signUpCreatesMemberWithEncryptedPassword() throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "Player@Example.com",
					  "password": "password123",
					  "nickname": "PlayerOne"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.id").isNumber())
			.andExpect(jsonPath("$.data.email").value("player@example.com"))
			.andExpect(jsonPath("$.data.nickname").value("PlayerOne"))
			.andExpect(jsonPath("$.data.role").value("USER"));

		Member member = memberRepository.findByEmail("player@example.com").orElseThrow();

		assertThat(member.getPasswordHash()).isNotEqualTo("password123");
		assertThat(passwordEncoder.matches("password123", member.getPasswordHash())).isTrue();
	}

	@Test
	void rejectDuplicateEmail() throws Exception {
		signUp("player@example.com");

		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "PLAYER@example.com",
					  "password": "password123",
					  "nickname": "PlayerTwo"
					}
					"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("MEMBER_001"));
	}

	@Test
	void rejectInvalidSignUpRequest() throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "not-email",
					  "password": "short",
					  "nickname": ""
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	private void signUp(String email) throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "password123",
					  "nickname": "PlayerOne"
					}
					""".formatted(email)))
			.andExpect(status().isCreated());
	}
}
