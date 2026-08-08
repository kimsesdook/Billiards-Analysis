package com.my.billiards.game.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.contact.repository.ContactInquiryRepository;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.game.repository.GameRoomParticipantRepository;
import com.my.billiards.game.repository.GameRoomRepository;
import com.my.billiards.invitation.repository.GameInvitationRepository;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notice.repository.NoticeRepository;
import com.my.billiards.notification.repository.NotificationRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutionException;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameRoomWebSocketIntegrationTest {

    private static final String PASSWORD = "password123";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @LocalServerPort
    private int port;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private GameRecordRepository gameRecordRepository;

    @Autowired
    private GameRoomParticipantRepository gameRoomParticipantRepository;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private GameInvitationRepository gameInvitationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NoticeRepository noticeRepository;

    @Autowired
    private ContactInquiryRepository contactInquiryRepository;

    @BeforeEach
    void setUp() {
        noticeRepository.deleteAll();
        contactInquiryRepository.deleteAll();
        gameRecordRepository.deleteAll();
        notificationRepository.deleteAll();
        gameInvitationRepository.deleteAll();
        gameRoomParticipantRepository.deleteAll();
        gameRoomRepository.deleteAll();
        friendshipRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void publishesJoinReadyAndStartEventsToRoomParticipants() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        String playerToken = signUpAndLogin("player@example.com", "Player");
        Long playerId = memberId("player@example.com");
        createAcceptedFriendship(hostToken, playerToken, playerId);
        Long roomId = createRoom(hostToken, "Realtime Match");
        Long invitationId = createLinkedInvitation(hostToken, playerId, roomId);

        GameRoomMessageHandler hostHandler = new GameRoomMessageHandler();
        WebSocketSession hostSession = connect(hostToken, roomId, hostHandler);
        WebSocketSession playerSession = null;
        try {
            hostHandler.await("CONNECTED").get(3, TimeUnit.SECONDS);
            CompletableFuture<JsonNode> joinedFuture = hostHandler.await("PARTICIPANT_JOINED");

            acceptInvitation(playerToken, invitationId);

            JsonNode joined = joinedFuture.get(5, TimeUnit.SECONDS);
            assertThat(joined.path("roomId").asLong()).isEqualTo(roomId);
            assertThat(joined.path("gameRoom").path("participants").size()).isEqualTo(2);

            GameRoomMessageHandler playerHandler = new GameRoomMessageHandler();
            playerSession = connect(playerToken, roomId, playerHandler);
            playerHandler.await("CONNECTED").get(3, TimeUnit.SECONDS);

            CompletableFuture<JsonNode> hostReadyFuture = hostHandler.await("READY_CHANGED");
            CompletableFuture<JsonNode> playerReadyFuture = playerHandler.await("READY_CHANGED");
            updateReady(playerToken, roomId, true);

            JsonNode hostReady = hostReadyFuture.get(5, TimeUnit.SECONDS);
            JsonNode playerReady = playerReadyFuture.get(5, TimeUnit.SECONDS);
            assertThat(isParticipantReady(hostReady, "Player")).isTrue();
            assertThat(playerReady).isEqualTo(hostReady);

            CompletableFuture<JsonNode> hostStartedFuture = hostHandler.await("GAME_STARTED");
            CompletableFuture<JsonNode> playerStartedFuture = playerHandler.await("GAME_STARTED");
            startRoom(hostToken, roomId);

            assertThat(hostStartedFuture.get(5, TimeUnit.SECONDS)
                .path("gameRoom").path("status").asText()).isEqualTo("IN_PROGRESS");
            assertThat(playerStartedFuture.get(5, TimeUnit.SECONDS)
                .path("gameRoom").path("status").asText()).isEqualTo("IN_PROGRESS");
        } finally {
            if (playerSession != null) {
                playerSession.close();
            }
            hostSession.close();
        }
    }

    @Test
    void publishesRoomCanceledEventToConnectedParticipant() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        Long roomId = createRoom(hostToken, "Canceled Match");
        GameRoomMessageHandler handler = new GameRoomMessageHandler();

        WebSocketSession session = connect(hostToken, roomId, handler);
        try {
            handler.await("CONNECTED").get(3, TimeUnit.SECONDS);
            CompletableFuture<JsonNode> canceledFuture = handler.await("ROOM_CANCELED");

            cancelRoom(hostToken, roomId);

            JsonNode canceled = canceledFuture.get(5, TimeUnit.SECONDS);
            assertThat(canceled.path("roomId").asLong()).isEqualTo(roomId);
            assertThat(canceled.path("gameRoom").path("status").asText()).isEqualTo("CANCELED");
        } finally {
            session.close();
        }
    }

    @Test
    void rejectsConnectionFromMemberWhoIsNotRoomParticipant() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        String outsiderToken = signUpAndLogin("outsider@example.com", "Outsider");
        Long roomId = createRoom(hostToken, "Private Match");

        assertThatThrownBy(() -> connect(outsiderToken, roomId, new GameRoomMessageHandler()))
            .isInstanceOf(ExecutionException.class);
    }

    @Test
    void rejectsConnectionWithoutToken() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        Long roomId = createRoom(hostToken, "Authenticated Match");
        String url = "ws://localhost:%d/ws/game-rooms/%d".formatted(port, roomId);

        assertThatThrownBy(() -> new StandardWebSocketClient()
            .execute(new GameRoomMessageHandler(), url)
            .get(3, TimeUnit.SECONDS))
            .isInstanceOf(ExecutionException.class);
    }

    private WebSocketSession connect(String token, Long roomId, GameRoomMessageHandler handler) throws Exception {
        String url = "ws://localhost:%d/ws/game-rooms/%d?token=%s".formatted(
            port,
            roomId,
            URLEncoder.encode(token, StandardCharsets.UTF_8)
        );

        return new StandardWebSocketClient()
            .execute(handler, url)
            .get(3, TimeUnit.SECONDS);
    }

    private Long createRoom(String token, String name) throws Exception {
        String response = mockMvc.perform(post("/api/game-rooms")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "%s",
                      "gameType": "3-Cushion",
                      "gameMode": "Individual",
                      "playerCapacity": 2,
                      "hostTargetScore": 20
                    }
                    """.formatted(name)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        return extractLong(response, "roomId");
    }

    private void createAcceptedFriendship(String hostToken, String playerToken, Long playerId) throws Exception {
        String response = mockMvc.perform(post("/api/friends/requests")
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "targetMemberId": %d
                    }
                    """.formatted(playerId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        Long requestId = extractLong(response, "requestId");

        mockMvc.perform(patch("/api/friends/requests/{requestId}/accept", requestId)
                .header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
            .andExpect(status().isOk());
    }

    private Long createLinkedInvitation(String hostToken, Long playerId, Long roomId) throws Exception {
        String response = mockMvc.perform(post("/api/game-invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "receiverMemberId": %d,
                      "gameType": "3-Cushion",
                      "gameRoomId": %d
                    }
                    """.formatted(playerId, roomId)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        return extractLong(response, "invitationId");
    }

    private void acceptInvitation(String token, Long invitationId) throws Exception {
        mockMvc.perform(patch("/api/game-invitations/{invitationId}/accept", invitationId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token)))
            .andExpect(status().isOk());
    }

    private void updateReady(String token, Long roomId, boolean ready) throws Exception {
        mockMvc.perform(patch("/api/game-rooms/{roomId}/ready", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "ready": %s
                    }
                    """.formatted(ready)))
            .andExpect(status().isOk());
    }

    private void startRoom(String token, Long roomId) throws Exception {
        mockMvc.perform(patch("/api/game-rooms/{roomId}/start", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token)))
            .andExpect(status().isOk());
    }

    private void cancelRoom(String token, Long roomId) throws Exception {
        mockMvc.perform(patch("/api/game-rooms/{roomId}/cancel", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token)))
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

    private boolean isParticipantReady(JsonNode message, String nickname) {
        for (JsonNode participant : message.path("gameRoom").path("participants")) {
            if (nickname.equals(participant.path("nickname").asText())) {
                return participant.path("ready").asBoolean();
            }
        }
        return false;
    }

    private Long memberId(String email) {
        return memberRepository.findByEmail(email).orElseThrow().getId();
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

    private final class GameRoomMessageHandler extends TextWebSocketHandler {

        private final ConcurrentMap<String, CompletableFuture<JsonNode>> messages = new ConcurrentHashMap<>();

        CompletableFuture<JsonNode> await(String eventType) {
            return messages.computeIfAbsent(eventType, ignored -> new CompletableFuture<>());
        }

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
            JsonNode data = objectMapper.readTree(message.getPayload()).path("data");
            String eventType = data.path("eventType").asText();
            messages.computeIfAbsent(eventType, ignored -> new CompletableFuture<>()).complete(data);
        }
    }
}
