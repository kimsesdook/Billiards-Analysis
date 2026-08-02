package com.my.billiards.member.controller;

import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.invitation.repository.GameInvitationRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notice.repository.NoticeRepository;
import com.my.billiards.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MemberControllerTest {

	private static final String PASSWORD = "password123";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private GameRecordRepository gameRecordRepository;

	@Autowired
	private FriendshipRepository friendshipRepository;

	@Autowired
	private GameInvitationRepository gameInvitationRepository;

	@Autowired
	private NotificationRepository notificationRepository;

	@Autowired
	private NoticeRepository noticeRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void setUp() {
		noticeRepository.deleteAll();
		gameRecordRepository.deleteAll();
		notificationRepository.deleteAll();
		gameInvitationRepository.deleteAll();
		friendshipRepository.deleteAll();
		memberRepository.deleteAll();
	}

	@Test
	void rejectGetProfileWithoutToken() throws Exception {
		mockMvc.perform(get("/api/members/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void getMyProfile() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/members/me")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.email").value("player@example.com"))
			.andExpect(jsonPath("$.data.name").value("PlayerOne"))
			.andExpect(jsonPath("$.data.nickname").value("PlayerOne"))
			.andExpect(jsonPath("$.data.targetCushionCount").value(1))
			.andExpect(jsonPath("$.data.threeBallHandicap").value(200))
			.andExpect(jsonPath("$.data.fourBallHandicap").value(250));
	}

	@Test
	void updateMyProfile() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(patch("/api/members/me/profile")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "name": "Kim Player",
					  "nickname": "ThreeCushionKing",
					  "targetCushionCount": 2,
					  "threeBallHandicap": 300,
					  "fourBallHandicap": 400
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.name").value("Kim Player"))
			.andExpect(jsonPath("$.data.nickname").value("ThreeCushionKing"))
			.andExpect(jsonPath("$.data.targetCushionCount").value(2))
			.andExpect(jsonPath("$.data.threeBallHandicap").value(300))
			.andExpect(jsonPath("$.data.fourBallHandicap").value(400));

		Member member = memberRepository.findByEmail("player@example.com").orElseThrow();
		assertThat(member.getDisplayName()).isEqualTo("Kim Player");
		assertThat(member.getNickname()).isEqualTo("ThreeCushionKing");
		assertThat(member.getTargetCushionCount()).isEqualTo(2);
	}

	@Test
	void rejectInvalidProfileUpdateRequest() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(patch("/api/members/me/profile")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "name": "",
					  "nickname": "",
					  "targetCushionCount": 3,
					  "threeBallHandicap": 10,
					  "fourBallHandicap": 2000
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	@Test
	void changeMyPassword() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(patch("/api/members/me/password")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "currentPassword": "password123",
					  "newPassword": "newPassword123"
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		Member member = memberRepository.findByEmail("player@example.com").orElseThrow();
		assertThat(passwordEncoder.matches("newPassword123", member.getPasswordHash())).isTrue();
		assertThat(passwordEncoder.matches(PASSWORD, member.getPasswordHash())).isFalse();
	}

	@Test
	void rejectPasswordChangeWithWrongCurrentPassword() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(patch("/api/members/me/password")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "currentPassword": "wrongPassword",
					  "newPassword": "newPassword123"
					}
					"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	private String signUpAndLogin(String email, String nickname) throws Exception {
		mockMvc.perform(post("/api/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "%s",
					  "nickname": "%s"
					}
					""".formatted(email, PASSWORD, nickname)))
			.andExpect(status().isCreated());

		String response = mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "%s"
					}
					""".formatted(email, PASSWORD)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractString(response, "accessToken");
	}

	private String bearer(String token) {
		return "Bearer " + token;
	}

	private String extractString(String content, String fieldName) {
		String marker = "\"" + fieldName + "\":\"";
		int start = content.indexOf(marker);
		if (start < 0) {
			throw new IllegalStateException("Cannot find field: " + fieldName);
		}
		int valueStart = start + marker.length();
		int valueEnd = content.indexOf("\"", valueStart);
		return content.substring(valueStart, valueEnd);
	}
}
