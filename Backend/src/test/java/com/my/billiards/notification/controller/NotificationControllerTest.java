package com.my.billiards.notification.controller;

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
class NotificationControllerTest {

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
	void rejectFindNotificationsWithoutToken() throws Exception {
		mockMvc.perform(get("/api/notifications"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void sendFriendRequestCreatesNotificationForReceiver() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();

		sendFriendRequest(senderToken, receiverId);

		mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data[0].type").value("FRIEND"))
			.andExpect(jsonPath("$.data[0].title").value("새 친구 요청"))
			.andExpect(jsonPath("$.data[0].message").value("Sender님이 친구 요청을 보냈습니다."))
			.andExpect(jsonPath("$.data[0].read").value(false))
			.andExpect(jsonPath("$.data[0].relatedResourceType").value("FRIEND_REQUEST"));

		mockMvc.perform(get("/api/notifications/unread-count")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data").value(1));
	}

	@Test
	void markAsReadAndDeleteNotification() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();

		sendFriendRequest(senderToken, receiverId);
		Long notificationId = findFirstNotificationId(receiverToken);

		mockMvc.perform(patch("/api/notifications/{notificationId}/read", notificationId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.read").value(true));

		mockMvc.perform(get("/api/notifications/unread-count")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data").value(0));

		mockMvc.perform(delete("/api/notifications/{notificationId}", notificationId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data").isEmpty());
	}

	@Test
	void acceptFriendRequestCreatesNotificationForRequester() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();
		Long requestId = sendFriendRequest(senderToken, receiverId);

		mockMvc.perform(patch("/api/friends/requests/{requestId}/accept", requestId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(senderToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data[0].type").value("FRIEND"))
			.andExpect(jsonPath("$.data[0].title").value("친구 요청 수락"))
			.andExpect(jsonPath("$.data[0].message").value("Receiver님이 친구 요청을 수락했습니다."))
			.andExpect(jsonPath("$.data[0].read").value(false))
			.andExpect(jsonPath("$.data[0].relatedResourceType").value("FRIENDSHIP"));
	}

	@Test
	void markAllAsReadAndDeleteAllNotifications() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();

		sendFriendRequest(senderToken, receiverId);

		mockMvc.perform(patch("/api/notifications/read-all")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/notifications/unread-count")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data").value(0));

		mockMvc.perform(delete("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data").isEmpty());
	}

	private Long sendFriendRequest(String token, Long targetMemberId) throws Exception {
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

	private Long findFirstNotificationId(String token) throws Exception {
		String response = mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "id");
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
