package com.my.billiards.game.controller;

import com.my.billiards.game.repository.GameRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameRecordControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private GameRecordRepository gameRecordRepository;

	@BeforeEach
	void setUp() {
		gameRecordRepository.deleteAll();
	}

	@Test
	void createGameRecordCalculatesAverageAndWin() throws Exception {
		mockMvc.perform(post("/api/game-records")
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
					  "opponentName": "김당구",
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
	void findAllGameRecords() throws Exception {
		createSampleRecord();

		mockMvc.perform(get("/api/game-records"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(1)))
			.andExpect(jsonPath("$.data[0].opponentName").value("김당구"));
	}

	@Test
	void deleteGameRecord() throws Exception {
		Long id = createSampleRecord();

		mockMvc.perform(delete("/api/game-records/{id}", id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/game-records/{id}", id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_002"));
	}

	@Test
	void rejectInvalidGameRecordRequest() throws Exception {
		mockMvc.perform(post("/api/game-records")
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

	private Long createSampleRecord() throws Exception {
		String location = mockMvc.perform(post("/api/game-records")
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
					  "opponentName": "김당구"
					}
					"""))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();

		String marker = "\"id\":";
		int idStart = location.indexOf(marker) + marker.length();
		int idEnd = location.indexOf(",", idStart);
		return Long.parseLong(location.substring(idStart, idEnd).trim());
	}
}
