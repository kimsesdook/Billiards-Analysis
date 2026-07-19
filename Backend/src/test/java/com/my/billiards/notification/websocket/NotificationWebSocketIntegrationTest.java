package com.my.billiards.notification.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notification.repository.NotificationRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationWebSocketIntegrationTest {

	private static final String PASSWORD = "password123";

	private final ObjectMapper objectMapper = new ObjectMapper();

	@LocalServerPort
	private int port;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private GameRecordRepository gameRecordRepository;

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
	void sendFriendRequestPushesRealtimeNotificationToReceiver() throws Exception {
		String senderToken = signUpAndLogin("sender@example.com", "Sender");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberRepository.findByEmail("receiver@example.com").orElseThrow().getId();
		CompletableFuture<Void> connectedFuture = new CompletableFuture<>();
		CompletableFuture<JsonNode> notificationFuture = new CompletableFuture<>();

		WebSocketSession session = connectNotificationSocket(receiverToken, connectedFuture, notificationFuture);
		try {
			connectedFuture.get(3, TimeUnit.SECONDS);
			sendFriendRequest(senderToken, receiverId);

			JsonNode notification = notificationFuture.get(5, TimeUnit.SECONDS);
			assertThat(notification.path("type").asText()).isEqualTo("FRIEND");
			assertThat(notification.path("title").asText()).isEqualTo("새 친구 요청");
			assertThat(notification.path("message").asText()).isEqualTo("Sender님이 친구 요청을 보냈습니다.");
			assertThat(notification.path("read").asBoolean()).isFalse();
		} finally {
			session.close();
		}
	}

	private WebSocketSession connectNotificationSocket(
		String token,
		CompletableFuture<Void> connectedFuture,
		CompletableFuture<JsonNode> notificationFuture
	) throws Exception {
		String url = "ws://localhost:%d/ws/notifications?token=%s".formatted(
			port,
			URLEncoder.encode(token, StandardCharsets.UTF_8)
		);

		return new StandardWebSocketClient()
			.execute(new TextWebSocketHandler() {
				@Override
				protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
					JsonNode body = objectMapper.readTree(message.getPayload());
					String eventType = body.path("data").path("eventType").asText();
					if ("CONNECTED".equals(eventType)) {
						connectedFuture.complete(null);
					}
					if ("NOTIFICATION_CREATED".equals(eventType)) {
						notificationFuture.complete(body.path("data").path("notification"));
					}
				}
			}, url)
			.get(3, TimeUnit.SECONDS);
	}

	private void sendFriendRequest(String token, Long targetMemberId) throws Exception {
		mockMvc.perform(post("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "targetMemberId": %d
					}
					""".formatted(targetMemberId)))
			.andExpect(status().isOk());
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
