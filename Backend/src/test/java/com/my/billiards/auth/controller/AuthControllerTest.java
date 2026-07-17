package com.my.billiards.auth.controller;

import com.my.billiards.game.repository.GameRecordRepository;
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
	private GameRecordRepository gameRecordRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void setUp() {
		gameRecordRepository.deleteAll();
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

	@Test
	void loginIssuesJwtAccessToken() throws Exception {
		signUp("player@example.com");

		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "PLAYER@example.com",
					  "password": "password123"
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.accessToken").isString())
			.andExpect(jsonPath("$.data.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.data.expiresInSeconds").value(3600))
			.andExpect(jsonPath("$.data.member.email").value("player@example.com"))
			.andExpect(jsonPath("$.data.member.role").value("USER"));
	}

	@Test
	void rejectLoginWithWrongPassword() throws Exception {
		signUp("player@example.com");

		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "player@example.com",
					  "password": "wrongPassword"
					}
					"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void rejectLoginWithUnknownEmail() throws Exception {
		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "unknown@example.com",
					  "password": "password123"
					}
					"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void rejectInvalidLoginRequest() throws Exception {
		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "not-email",
					  "password": ""
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
