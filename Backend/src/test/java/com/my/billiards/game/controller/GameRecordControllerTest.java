package com.my.billiards.game.controller;

import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.repository.MemberRepository;
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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameRecordControllerTest {

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
	private NotificationRepository notificationRepository;

	@BeforeEach
	void setUp() {
		gameRecordRepository.deleteAll();
		notificationRepository.deleteAll();
		friendshipRepository.deleteAll();
		memberRepository.deleteAll();
	}

	@Test
	void rejectCreateGameRecordWithoutToken() throws Exception {
		mockMvc.perform(post("/api/game-records")
				.contentType(MediaType.APPLICATION_JSON)
				.content(gameRecordJson("Opponent")))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void createGameRecordCalculatesAverageAndWin() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(post("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "2026-07-11T10:00:00Z",
					  "type": "3-Cushion",
					  "mode": "Individual",
					  "myScore": 15,
					  "opponentScore": 12,
					  "innings": 18,
					  "highRun": 4,
					  "playerCount": 2,
					  "opponentName": "Opponent",
					  "inningScores": [0, 2, 1, 4]
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.id").isNumber())
			.andExpect(jsonPath("$.data.type").value("3-Cushion"))
			.andExpect(jsonPath("$.data.mode").value("Individual"))
			.andExpect(jsonPath("$.data.average").value(0.833))
			.andExpect(jsonPath("$.data.win").value(true))
			.andExpect(jsonPath("$.data.inningScores", hasSize(4)));
	}

	@Test
	void findAllGameRecordsReturnsOnlyMine() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		createSampleRecord(myToken, "Visible Opponent");
		createSampleRecord(otherToken, "Hidden Opponent");

		mockMvc.perform(get("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(1)))
			.andExpect(jsonPath("$.data[0].opponentName").value("Visible Opponent"));
	}

	@Test
	void getOpponentStatisticsAggregatesOnlyMyRecords() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		createOpponentRecord(myToken, "2026-07-01T10:00:00Z", "Kim", 10, 5, 10, 3);
		createOpponentRecord(myToken, "2026-07-03T10:00:00Z", "Kim", 10, 12, 8, 5);
		createOpponentRecord(myToken, "2026-07-04T10:00:00Z", "Lee", 20, 10, 10, 7);
		createOpponentRecord(otherToken, "2026-07-05T10:00:00Z", "Kim", 50, 1, 10, 10);

		mockMvc.perform(get("/api/game-records/opponent-statistics")
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(2)))
			.andExpect(jsonPath("$.data[0].opponentName").value("Kim"))
			.andExpect(jsonPath("$.data[0].totalGames").value(2))
			.andExpect(jsonPath("$.data[0].wins").value(1))
			.andExpect(jsonPath("$.data[0].losses").value(1))
			.andExpect(jsonPath("$.data[0].winRate").value(50))
			.andExpect(jsonPath("$.data[0].overallAverage").value(1.111))
			.andExpect(jsonPath("$.data[0].bestAverage").value(1.25))
			.andExpect(jsonPath("$.data[0].maxHighRun").value(5))
			.andExpect(jsonPath("$.data[0].totalInnings").value(18))
			.andExpect(jsonPath("$.data[0].totalMyScore").value(20))
			.andExpect(jsonPath("$.data[0].totalOpponentScore").value(17))
			.andExpect(jsonPath("$.data[0].lastPlayedAt").value("2026-07-03T10:00:00Z"));
	}

	@Test
	void getWeeklyReportComparesTwoWeeksAndExcludesOtherMembersRecords() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		createGameRecord(myToken, "2026-07-01T10:00:00Z", "3-Cushion", 10, 5, 10, 2);
		createGameRecord(myToken, "2026-07-02T10:00:00Z", "3-Cushion", 10, 15, 10, 3);
		createGameRecord(myToken, "2026-07-05T10:00:00Z", "3-Cushion", 20, 10, 10, 4);
		createGameRecord(myToken, "2026-07-08T10:00:00Z", "3-Cushion", 10, 5, 10, 2);
		createGameRecord(myToken, "2026-07-10T10:00:00Z", "3-Cushion", 20, 25, 10, 5);
		createGameRecord(myToken, "2026-07-14T10:00:00Z", "3-Cushion", 12, 10, 6, 4);
		createGameRecord(myToken, "2026-07-15T10:00:00Z", "3-Cushion", 100, 1, 10, 20);
		createGameRecord(otherToken, "2026-07-10T10:00:00Z", "3-Cushion", 100, 1, 10, 20);

		mockMvc.perform(get("/api/game-records/weekly-report")
				.queryParam("type", "3-Cushion")
				.queryParam("referenceDate", "2026-07-14")
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.type").value("3-Cushion"))
			.andExpect(jsonPath("$.data.currentWeekStartDate").value("2026-07-08"))
			.andExpect(jsonPath("$.data.currentWeekEndDate").value("2026-07-14"))
			.andExpect(jsonPath("$.data.previousWeekStartDate").value("2026-07-01"))
			.andExpect(jsonPath("$.data.previousWeekEndDate").value("2026-07-07"))
			.andExpect(jsonPath("$.data.currentWeek.totalGames").value(3))
			.andExpect(jsonPath("$.data.currentWeek.wins").value(2))
			.andExpect(jsonPath("$.data.currentWeek.losses").value(1))
			.andExpect(jsonPath("$.data.currentWeek.winRate").value(67))
			.andExpect(jsonPath("$.data.currentWeek.overallAverage").value(1.615))
			.andExpect(jsonPath("$.data.currentWeek.maxHighRun").value(5))
			.andExpect(jsonPath("$.data.previousWeek.totalGames").value(3))
			.andExpect(jsonPath("$.data.previousWeek.overallAverage").value(1.333))
			.andExpect(jsonPath("$.data.comparison.hasPreviousWeekData").value(true))
			.andExpect(jsonPath("$.data.comparison.overallAverageChange").value(0.282))
			.andExpect(jsonPath("$.data.comparison.overallAverageChangeRate").value(21.2))
			.andExpect(jsonPath("$.data.comparison.highRunChange").value(1))
			.andExpect(jsonPath("$.data.comparison.trend").value("RISING"));
	}

	@Test
	void searchGameRecordsFiltersByConditionsAndReturnsPaginationMetadata() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		createSearchRecord(myToken, "2026-07-01T10:00:00Z", "3-Cushion", "Individual", "Alex Kim", "Opening match");
		createSearchRecord(myToken, "2026-07-02T10:00:00Z", "4-Ball", "Team", "Bora Lee", "Team match");
		createSearchRecord(myToken, "2026-07-03T10:00:00Z", "3-Cushion", "Individual", "Alex Park", "Keyword match");
		createSearchRecord(
			myToken,
			"2026-07-04T10:00:00Z",
			"3-Cushion",
			"Individual",
			"Alex Three",
			"Three player match",
			3
		);
		createSearchRecord(otherToken, "2026-07-05T10:00:00Z", "3-Cushion", "Individual", "Alex Other", "Other member");

		mockMvc.perform(get("/api/game-records/search")
				.queryParam("type", "3-Cushion")
				.queryParam("mode", "Individual")
				.queryParam("playerCount", "2")
				.queryParam("keyword", "alex")
				.queryParam("page", "0")
				.queryParam("size", "1")
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.content", hasSize(1)))
			.andExpect(jsonPath("$.data.content[0].opponentName").value("Alex Park"))
			.andExpect(jsonPath("$.data.page").value(0))
			.andExpect(jsonPath("$.data.size").value(1))
			.andExpect(jsonPath("$.data.totalElements").value(2))
			.andExpect(jsonPath("$.data.totalPages").value(2))
			.andExpect(jsonPath("$.data.hasNext").value(true));

		mockMvc.perform(get("/api/game-records/search")
				.queryParam("type", "3-Cushion")
				.queryParam("mode", "Individual")
				.queryParam("playerCount", "2")
				.queryParam("keyword", "alex")
				.queryParam("page", "1")
				.queryParam("size", "1")
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content", hasSize(1)))
			.andExpect(jsonPath("$.data.content[0].opponentName").value("Alex Kim"))
			.andExpect(jsonPath("$.data.hasNext").value(false));
	}

	@Test
	void rejectSearchGameRecordsWithInvalidPageRequest() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/game-records/search")
				.queryParam("page", "-1")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));

		mockMvc.perform(get("/api/game-records/search")
				.queryParam("size", "101")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));

		mockMvc.perform(get("/api/game-records/search")
				.queryParam("playerCount", "5")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	@Test
	void getStatisticsAggregatesOnlyMyRecordsForTheRequestedGameType() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		createGameRecord(myToken, "2026-07-01T10:00:00Z", "3-Cushion", 10, 8, 10, 2);
		createGameRecord(myToken, "2026-07-02T10:00:00Z", "3-Cushion", 12, 15, 10, 3);
		createGameRecord(myToken, "2026-07-03T10:00:00Z", "3-Cushion", 15, 10, 10, 5);
		createGameRecord(myToken, "2026-07-04T10:00:00Z", "4-Ball", 50, 40, 10, 10);
		createGameRecord(otherToken, "2026-07-05T10:00:00Z", "3-Cushion", 100, 1, 10, 20);

		mockMvc.perform(get("/api/game-records/statistics")
				.queryParam("type", "3-Cushion")
				.queryParam("recentGameCount", "2")
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.type").value("3-Cushion"))
			.andExpect(jsonPath("$.data.totalGames").value(3))
			.andExpect(jsonPath("$.data.wins").value(2))
			.andExpect(jsonPath("$.data.losses").value(1))
			.andExpect(jsonPath("$.data.winRate").value(67))
			.andExpect(jsonPath("$.data.overallAverage").value(1.233))
			.andExpect(jsonPath("$.data.bestAverage").value(1.5))
			.andExpect(jsonPath("$.data.maxHighRun").value(5))
			.andExpect(jsonPath("$.data.totalInnings").value(30))
			.andExpect(jsonPath("$.data.totalPoints").value(37))
			.andExpect(jsonPath("$.data.calculatedDama").value(135))
			.andExpect(jsonPath("$.data.trend").value("STABLE"))
			.andExpect(jsonPath("$.data.changeRate").value(0.0))
			.andExpect(jsonPath("$.data.recentAverageTrends", hasSize(2)))
			.andExpect(jsonPath("$.data.recentAverageTrends[0].average").value(1.2))
			.andExpect(jsonPath("$.data.recentAverageTrends[1].average").value(1.5));
	}

	@Test
	void getStatisticsReturnsRisingTrendWhenRecentGamesImprove() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		for (int day = 1; day <= 5; day++) {
			createGameRecord(
				token,
				"2026-07-%02dT10:00:00Z".formatted(day),
				"3-Cushion",
				10,
				5,
				10,
				2
			);
		}
		for (int day = 6; day <= 10; day++) {
			createGameRecord(
				token,
				"2026-07-%02dT10:00:00Z".formatted(day),
				"3-Cushion",
				20,
				5,
				10,
				4
			);
		}

		mockMvc.perform(get("/api/game-records/statistics")
				.queryParam("type", "3-Cushion")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.trend").value("RISING"))
			.andExpect(jsonPath("$.data.changeRate").value(100.0));
	}

	@Test
	void rejectStatisticsRequestWithInvalidGameType() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/game-records/statistics")
				.queryParam("type", "INVALID")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	@Test
	void rejectStatisticsRequestWithoutGameType() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/game-records/statistics")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	@Test
	void rejectStatisticsRequestWithInvalidRecentGameCount() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/game-records/statistics")
				.queryParam("type", "3-Cushion")
				.queryParam("recentGameCount", "0")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	@Test
	void deleteGameRecord() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");
		Long id = createSampleRecord(token, "Opponent");

		mockMvc.perform(delete("/api/game-records/{id}", id)
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/game-records/{id}", id)
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_002"));
	}

	@Test
	void updateGameRecordRecalculatesAverageAndWin() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");
		Long id = createSampleRecord(token, "Before Update");

		mockMvc.perform(patch("/api/game-records/{id}", id)
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "2026-07-12T10:00:00Z",
					  "type": "4-Ball",
					  "mode": "Individual",
					  "myScore": 30,
					  "opponentScore": 31,
					  "innings": 20,
					  "highRun": 7,
					  "playerCount": 2,
					  "rank": 1,
					  "lastThreeCushions": 2,
					  "notes": "Updated record",
					  "opponentName": "Updated Opponent",
					  "inningScores": [1, 2, 3],
					  "myCushionScore": 2,
					  "opponentCushionScore": 1
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.type").value("4-Ball"))
			.andExpect(jsonPath("$.data.myScore").value(30))
			.andExpect(jsonPath("$.data.average").value(1.5))
			.andExpect(jsonPath("$.data.win").value(false))
			.andExpect(jsonPath("$.data.rank").doesNotExist())
			.andExpect(jsonPath("$.data.lastThreeCushions").value(2))
			.andExpect(jsonPath("$.data.inningScores", hasSize(3)));

		mockMvc.perform(get("/api/game-records/{id}", id)
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.opponentName").value("Updated Opponent"))
			.andExpect(jsonPath("$.data.notes").value("Updated record"));
	}

	@Test
	void rejectUpdatingOtherMembersRecordAsNotFound() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		Long otherRecordId = createSampleRecord(otherToken, "Other Record");

		mockMvc.perform(patch("/api/game-records/{id}", otherRecordId)
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(gameRecordJson("Unauthorized Update")))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_002"));

		mockMvc.perform(get("/api/game-records/{id}", otherRecordId)
				.header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.opponentName").value("Other Record"));
	}

	@Test
	void rejectInvalidUpdateGameRecordRequest() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");
		Long id = createSampleRecord(token, "Opponent");

		mockMvc.perform(patch("/api/game-records/{id}", id)
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "2026-07-11T10:00:00Z",
					  "type": "3-Cushion",
					  "mode": "Individual",
					  "myScore": 15,
					  "opponentScore": 12,
					  "innings": 0,
					  "highRun": 4,
					  "playerCount": 2
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"))
			.andExpect(jsonPath("$.errors[0].field").value("innings"));
	}

	@Test
	void rejectDeletingOtherMembersRecordAsNotFound() throws Exception {
		String myToken = signUpAndLogin("player@example.com", "PlayerOne");
		String otherToken = signUpAndLogin("other@example.com", "OtherPlayer");
		Long otherRecordId = createSampleRecord(otherToken, "Other Record");

		mockMvc.perform(delete("/api/game-records/{id}", otherRecordId)
				.header(HttpHeaders.AUTHORIZATION, bearer(myToken)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_002"));

		mockMvc.perform(get("/api/game-records/{id}", otherRecordId)
				.header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.opponentName").value("Other Record"));
	}

	@Test
	void rejectInvalidGameRecordRequest() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(post("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "2026-07-11T10:00:00Z",
					  "type": "3-Cushion",
					  "mode": "Individual",
					  "myScore": 15,
					  "opponentScore": 12,
					  "innings": 0,
					  "highRun": 4,
					  "playerCount": 2
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_001"))
			.andExpect(jsonPath("$.errors[0].field").value("innings"));
	}

	private Long createSampleRecord(String token, String opponentName) throws Exception {
		String response = mockMvc.perform(post("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content(gameRecordJson(opponentName)))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "id");
	}

	private void createGameRecord(
		String token,
		String date,
		String type,
		int myScore,
		int opponentScore,
		int innings,
		int highRun
	) throws Exception {
		mockMvc.perform(post("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "%s",
					  "type": "%s",
					  "mode": "Individual",
					  "myScore": %d,
					  "opponentScore": %d,
					  "innings": %d,
					  "highRun": %d,
					  "playerCount": 2
					}
					""".formatted(date, type, myScore, opponentScore, innings, highRun)))
			.andExpect(status().isCreated());
	}

	private void createSearchRecord(
		String token,
		String date,
		String type,
		String mode,
		String opponentName,
		String notes
	) throws Exception {
		createSearchRecord(token, date, type, mode, opponentName, notes, 2);
	}

	private void createSearchRecord(
		String token,
		String date,
		String type,
		String mode,
		String opponentName,
		String notes,
		int playerCount
	) throws Exception {
		mockMvc.perform(post("/api/game-records")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "date": "%s",
					  "type": "%s",
					  "mode": "%s",
					  "myScore": 15,
					  "opponentScore": 12,
					  "innings": 18,
					  "highRun": 4,
					  "playerCount": %d,
					  "opponentName": "%s",
					  "notes": "%s"
					}
					""".formatted(date, type, mode, playerCount, opponentName, notes)))
			.andExpect(status().isCreated());
	}

	private void createOpponentRecord(
		String token,
		String date,
		String opponentName,
		int myScore,
		int opponentScore,
		int innings,
		int highRun
	) throws Exception {
		mockMvc.perform(post("/api/game-records")
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
			.andExpect(status().isCreated());
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
					""".formatted(email.toUpperCase(), PASSWORD)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractString(response, "accessToken");
	}

	private String gameRecordJson(String opponentName) {
		return """
			{
			  "date": "2026-07-11T10:00:00Z",
			  "type": "3-Cushion",
			  "mode": "Individual",
			  "myScore": 15,
			  "opponentScore": 12,
			  "innings": 18,
			  "highRun": 4,
			  "playerCount": 2,
			  "opponentName": "%s"
			}
			""".formatted(opponentName);
	}

	private String bearer(String token) {
		return "Bearer " + token;
	}

	private Long extractLong(String content, String fieldName) {
		String marker = "\"" + fieldName + "\":";
		int valueStart = content.indexOf(marker) + marker.length();
		int valueEnd = content.indexOf(",", valueStart);
		if (valueEnd == -1) {
			valueEnd = content.indexOf("}", valueStart);
		}
		return Long.parseLong(content.substring(valueStart, valueEnd).trim());
	}

	private String extractString(String content, String fieldName) {
		String marker = "\"" + fieldName + "\":\"";
		int valueStart = content.indexOf(marker) + marker.length();
		int valueEnd = content.indexOf("\"", valueStart);
		return content.substring(valueStart, valueEnd);
	}
}
