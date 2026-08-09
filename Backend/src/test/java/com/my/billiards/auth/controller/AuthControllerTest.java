package com.my.billiards.auth.controller;

import com.my.billiards.auth.domain.RefreshToken;
import com.my.billiards.auth.repository.RefreshTokenRepository;
import com.my.billiards.auth.token.RefreshTokenCodec;
import com.my.billiards.auth.token.RefreshTokenCookieFactory;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.game.repository.GameRoomParticipantRepository;
import com.my.billiards.game.repository.GameRoomRepository;
import com.my.billiards.invitation.repository.GameInvitationRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notice.repository.NoticeRepository;
import com.my.billiards.notification.repository.NotificationRepository;
import jakarta.servlet.http.Cookie;
import java.util.List;
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
import org.springframework.test.web.servlet.MvcResult;

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
	private FriendshipRepository friendshipRepository;

	@Autowired
	private GameInvitationRepository gameInvitationRepository;

	@Autowired
	private GameRoomParticipantRepository gameRoomParticipantRepository;

	@Autowired
	private GameRoomRepository gameRoomRepository;

	@Autowired
	private NotificationRepository notificationRepository;

	@Autowired
	private NoticeRepository noticeRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private RefreshTokenRepository refreshTokenRepository;

	@Autowired
	private RefreshTokenCodec refreshTokenCodec;

	@BeforeEach
	void setUp() {
		refreshTokenRepository.deleteAll();
		noticeRepository.deleteAll();
		gameRecordRepository.deleteAll();
		notificationRepository.deleteAll();
		gameInvitationRepository.deleteAll();
		gameRoomParticipantRepository.deleteAll();
		gameRoomRepository.deleteAll();
		friendshipRepository.deleteAll();
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

		MvcResult result = mockMvc.perform(post("/api/auth/login")
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
			.andExpect(jsonPath("$.data.member.role").value("USER"))
			.andReturn();

		String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
		String rawRefreshToken = extractRefreshToken(setCookie);

		assertThat(result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
		assertThat(setCookie)
			.contains("HttpOnly")
			.contains("SameSite=Strict")
			.contains("Path=/api/auth");
		assertThat(rawRefreshToken).isNotBlank();
		assertThat(refreshTokenRepository.findAll())
			.singleElement()
			.satisfies(token -> {
				assertThat(token.getTokenHash()).isEqualTo(refreshTokenCodec.hash(rawRefreshToken));
				assertThat(token.getTokenHash()).doesNotContain(rawRefreshToken);
				assertThat(token.getRevokedAt()).isNull();
			});
	}

	@Test
	void refreshRotatesTokenAndIssuesNewAccessToken() throws Exception {
		signUp("player@example.com");
		String firstRefreshToken = extractRefreshToken(login("player@example.com"));

		MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
				.cookie(refreshCookie(firstRefreshToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.accessToken").isString())
			.andExpect(jsonPath("$.data.member.email").value("player@example.com"))
			.andReturn();

		String secondRefreshToken = extractRefreshToken(refreshResult);
		assertThat(secondRefreshToken).isNotEqualTo(firstRefreshToken);

		List<RefreshToken> tokens = refreshTokenRepository.findAll();
		assertThat(tokens).hasSize(2);
		assertThat(tokens)
			.filteredOn(token -> token.getTokenHash().equals(refreshTokenCodec.hash(firstRefreshToken)))
			.singleElement()
			.satisfies(token -> {
				assertThat(token.getRevokedAt()).isNotNull();
				assertThat(token.getReplacedByTokenHash())
					.isEqualTo(refreshTokenCodec.hash(secondRefreshToken));
			});
		assertThat(tokens)
			.filteredOn(token -> token.getTokenHash().equals(refreshTokenCodec.hash(secondRefreshToken)))
			.singleElement()
			.satisfies(token -> assertThat(token.getRevokedAt()).isNull());
	}

	@Test
	void reuseOfRotatedTokenRevokesTheWholeSession() throws Exception {
		signUp("player@example.com");
		String firstRefreshToken = extractRefreshToken(login("player@example.com"));
		MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
				.cookie(refreshCookie(firstRefreshToken)))
			.andExpect(status().isOk())
			.andReturn();
		String secondRefreshToken = extractRefreshToken(refreshResult);

		mockMvc.perform(post("/api/auth/refresh")
				.cookie(refreshCookie(firstRefreshToken)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTH_001"));

		mockMvc.perform(post("/api/auth/refresh")
				.cookie(refreshCookie(secondRefreshToken)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTH_001"));

		assertThat(refreshTokenRepository.findAll())
			.allSatisfy(token -> assertThat(token.getRevokedAt()).isNotNull());
	}

	@Test
	void logoutRevokesSessionAndClearsCookie() throws Exception {
		signUp("player@example.com");
		String refreshToken = extractRefreshToken(login("player@example.com"));

		MvcResult logoutResult = mockMvc.perform(post("/api/auth/logout")
				.cookie(refreshCookie(refreshToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andReturn();

		assertThat(logoutResult.getResponse().getHeader(HttpHeaders.SET_COOKIE))
			.contains(RefreshTokenCookieFactory.COOKIE_NAME + "=")
			.contains("Max-Age=0")
			.contains("HttpOnly");

		mockMvc.perform(post("/api/auth/refresh")
				.cookie(refreshCookie(refreshToken)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void rejectRefreshWithoutCookie() throws Exception {
		mockMvc.perform(post("/api/auth/refresh"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTH_001"));
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

	private MvcResult login(String email) throws Exception {
		return mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "password123"
					}
					""".formatted(email)))
			.andExpect(status().isOk())
			.andReturn();
	}

	private Cookie refreshCookie(String value) {
		return new Cookie(RefreshTokenCookieFactory.COOKIE_NAME, value);
	}

	private String extractRefreshToken(MvcResult result) {
		return extractRefreshToken(result.getResponse().getHeader(HttpHeaders.SET_COOKIE));
	}

	private String extractRefreshToken(String setCookie) {
		assertThat(setCookie).isNotNull();
		String prefix = RefreshTokenCookieFactory.COOKIE_NAME + "=";
		int valueStart = setCookie.indexOf(prefix) + prefix.length();
		int valueEnd = setCookie.indexOf(';', valueStart);
		return setCookie.substring(valueStart, valueEnd);
	}
}
