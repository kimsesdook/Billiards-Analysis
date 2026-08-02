package com.my.billiards.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.game.repository.GameRoomParticipantRepository;
import com.my.billiards.game.repository.GameRoomRepository;
import com.my.billiards.invitation.repository.GameInvitationRepository;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserFlowIntegrationTest {

	private static final String PASSWORD = "password123";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private GameRecordRepository gameRecordRepository;

	@Autowired
	private MemberRepository memberRepository;

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

	private final ObjectMapper objectMapper = new ObjectMapper();

	@BeforeEach
	void setUp() {
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
	void registeredMemberCanRecordGamesAndSeeOnlyOwnStatistics() throws Exception {
		String playerToken = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/members/me")
				.header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.email").value("player@example.com"))
			.andExpect(jsonPath("$.data.nickname").value("PlayerOne"));

		Long playerRecordId = createGameRecord(
			playerToken,
			"2026-07-10T10:00:00Z",
			"Practice Partner",
			15,
			12,
			18,
			4
		);
		createGameRecord(
			playerToken,
			"2026-07-11T10:00:00Z",
			"League Opponent",
			12,
			15,
			12,
			3
		);

		String otherPlayerToken = signUpAndLogin("other@example.com", "OtherPlayer");
		createGameRecord(
			otherPlayerToken,
			"2026-07-12T10:00:00Z",
			"Hidden Opponent",
			100,
			1,
			10,
			20
		);

		mockMvc.perform(get("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(2)))
			.andExpect(jsonPath("$.data[*].opponentName", hasItem("Practice Partner")))
			.andExpect(jsonPath("$.data[*].opponentName", hasItem("League Opponent")))
			.andExpect(jsonPath("$.data[*].opponentName", not(hasItem("Hidden Opponent"))));

		mockMvc.perform(get("/api/game-records/statistics")
				.queryParam("type", "3-Cushion")
				.header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.totalGames").value(2))
			.andExpect(jsonPath("$.data.wins").value(1))
			.andExpect(jsonPath("$.data.losses").value(1))
			.andExpect(jsonPath("$.data.totalInnings").value(30))
			.andExpect(jsonPath("$.data.totalPoints").value(27));

		mockMvc.perform(get("/api/game-records/{id}", playerRecordId)
				.header(HttpHeaders.AUTHORIZATION, bearer(otherPlayerToken)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_002"));
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

		MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "%s"
					}
					""".formatted(email.toUpperCase(), PASSWORD)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.accessToken").isString())
			.andReturn();

		JsonNode response = objectMapper.readTree(loginResult.getResponse().getContentAsString());
		return response.path("data").path("accessToken").asText();
	}

	private Long createGameRecord(
		String token,
		String date,
		String opponentName,
		int myScore,
		int opponentScore,
		int innings,
		int highRun
	) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "%s",
					  "type": "3-Cushion",
					  "mode": "Individual",
					  "myScore": %d,
					  "opponentScore": %d,
					  "innings": %d,
					  "highRun": %d,
					  "playerCount": 2,
					  "opponentName": "%s"
					}
					""".formatted(date, myScore, opponentScore, innings, highRun, opponentName)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andReturn();

		JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
		return response.path("data").path("id").asLong();
	}

	private String bearer(String token) {
		return "Bearer " + token;
	}
}
