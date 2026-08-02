package com.my.billiards.friend.controller;

import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FriendControllerTest {

	private static final String PASSWORD = "password123";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private FriendshipRepository friendshipRepository;

	@Autowired
	private GameRecordRepository gameRecordRepository;

	@Autowired
	private GameInvitationRepository gameInvitationRepository;

	@Autowired
	private NotificationRepository notificationRepository;

	@Autowired
	private NoticeRepository noticeRepository;

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
	void rejectFindFriendsWithoutToken() throws Exception {
		mockMvc.perform(get("/api/friends"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void sendRequestAndListRequests() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();

		mockMvc.perform(post("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "targetMemberId": %d
					}
					""".formatted(receiverId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.member.nickname").value("Receiver"))
			.andExpect(jsonPath("$.data.direction").value("OUTGOING"));

		mockMvc.perform(get("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.incoming[0].member.nickname").value("Sender"))
			.andExpect(jsonPath("$.data.incoming[0].direction").value("INCOMING"))
			.andExpect(jsonPath("$.data.outgoing").isEmpty());
	}

	@Test
	void acceptRequestCreatesFriendForBothMembers() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();
		Long requestId = sendRequest(senderToken, receiverId);

		mockMvc.perform(patch("/api/friends/requests/{requestId}/accept", requestId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.friend.nickname").value("Sender"));

		mockMvc.perform(get("/api/friends")
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].friend.nickname").value("Receiver"));

		mockMvc.perform(get("/api/friends")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].friend.nickname").value("Sender"));
	}

	@Test
	void declineRequestRemovesPendingRequest() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();
		Long requestId = sendRequest(senderToken, receiverId);

		mockMvc.perform(patch("/api/friends/requests/{requestId}/decline", requestId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.incoming").isEmpty());
	}

	@Test
	void rejectReverseDuplicateRequest() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long senderId = memberRepository.findByEmail("sender@example.com").orElseThrow().getId();
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();

		sendRequest(senderToken, receiverId);

		mockMvc.perform(post("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "targetMemberId": %d
					}
					""".formatted(senderId)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("FRIEND_002"));
	}

	@Test
	void rejectSelfFriendRequest() throws Exception {
		String token = signUpAndLogin("player@example.com", "Player");
		Long memberId = memberRepository.findByEmail("player@example.com").orElseThrow().getId();

		mockMvc.perform(post("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "targetMemberId": %d
					}
					""".formatted(memberId)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("FRIEND_001"));
	}

	@Test
	void removeFriend() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();
		Long requestId = sendRequest(senderToken, receiverId);

		String acceptResponse = mockMvc.perform(patch("/api/friends/requests/{requestId}/accept", requestId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		Long friendshipId = extractLong(acceptResponse, "friendshipId");

		mockMvc.perform(delete("/api/friends/{friendshipId}", friendshipId)
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/friends")
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data").isEmpty());
	}

	@Test
	void searchMembersWithRelationshipStatus() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long senderId = memberRepository.findByEmail("sender@example.com").orElseThrow().getId();
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();

		mockMvc.perform(get("/api/friends/search")
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken))
				.param("keyword", "Receiver"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].memberId").value(receiverId))
			.andExpect(jsonPath("$.data[0].relationshipStatus").value("NONE"));

		sendRequest(senderToken, receiverId);

		mockMvc.perform(get("/api/friends/search")
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken))
				.param("keyword", "Receiver"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].relationshipStatus").value("PENDING_OUTGOING"));

		mockMvc.perform(get("/api/friends/search")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken))
				.param("keyword", "Sender"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data[0].memberId").value(senderId))
			.andExpect(jsonPath("$.data[0].relationshipStatus").value("PENDING_INCOMING"));
	}

	private Long sendRequest(String token, Long targetMemberId) throws Exception {
		String response = mockMvc.perform(post("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "targetMemberId": %d
					}
					""".formatted(targetMemberId)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "requestId");
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

	private Long extractLong(String content, String fieldName) {
		String marker = "\"" + fieldName + "\":";
		int start = content.indexOf(marker);
		if (start < 0) {
			throw new IllegalStateException("Cannot find field: " + fieldName);
		}
		int valueStart = start + marker.length();
		int valueEnd = content.indexOf(",", valueStart);
		if (valueEnd < 0) {
			valueEnd = content.indexOf("}", valueStart);
		}
		return Long.parseLong(content.substring(valueStart, valueEnd).trim());
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
