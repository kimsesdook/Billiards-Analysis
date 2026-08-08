package com.my.billiards.game.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.my.billiards.contact.repository.ContactInquiryRepository;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameRoomLiveStateControllerTest {

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
    void hostUpdatesLiveStateAndParticipantReadsIt() throws Exception {
        StartedRoom room = createStartedRoom();

        mockMvc.perform(put("/api/game-rooms/{roomId}/live-state", room.roomId())
                .header(HttpHeaders.AUTHORIZATION, bearer(room.hostToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(liveStateRequest(0, 2, room.playerId(), room.hostId(), room.playerId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.stateVersion").value(1))
            .andExpect(jsonPath("$.data.currentInning").value(2))
            .andExpect(jsonPath("$.data.activeMemberId").value(room.playerId()))
            .andExpect(jsonPath("$.data.scores[0].currentScore").value(3))
            .andExpect(jsonPath("$.data.scores[0].cushionScore").value(1))
            .andExpect(jsonPath("$.data.scores[1].currentScore").value(5))
            .andExpect(jsonPath("$.data.scores[1].highRun").value(4));

        mockMvc.perform(get("/api/game-rooms/{roomId}/live-state", room.roomId())
                .header(HttpHeaders.AUTHORIZATION, bearer(room.playerToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.stateVersion").value(1))
            .andExpect(jsonPath("$.data.currentInning").value(2))
            .andExpect(jsonPath("$.data.activeMemberId").value(room.playerId()))
            .andExpect(jsonPath("$.data.scores[0].memberId").value(room.hostId()))
            .andExpect(jsonPath("$.data.scores[1].memberId").value(room.playerId()));
    }

    @Test
    void rejectsLiveStateUpdateFromParticipantWhoIsNotHost() throws Exception {
        StartedRoom room = createStartedRoom();

        mockMvc.perform(put("/api/game-rooms/{roomId}/live-state", room.roomId())
                .header(HttpHeaders.AUTHORIZATION, bearer(room.playerToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(liveStateRequest(0, 1, room.hostId(), room.hostId(), room.playerId())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("AUTH_002"));
    }

    @Test
    void rejectsStaleLiveStateVersion() throws Exception {
        StartedRoom room = createStartedRoom();
        String request = liveStateRequest(0, 2, room.playerId(), room.hostId(), room.playerId());

        mockMvc.perform(put("/api/game-rooms/{roomId}/live-state", room.roomId())
                .header(HttpHeaders.AUTHORIZATION, bearer(room.hostToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.stateVersion").value(1));

        mockMvc.perform(put("/api/game-rooms/{roomId}/live-state", room.roomId())
                .header(HttpHeaders.AUTHORIZATION, bearer(room.hostToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ROOM_008"));
    }

    @Test
    void rejectsLiveStateUpdateBeforeGameStarts() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        Long hostId = memberId("host@example.com");
        Long roomId = createRoom(hostToken);

        mockMvc.perform(put("/api/game-rooms/{roomId}/live-state", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(singlePlayerLiveStateRequest(hostId)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ROOM_007"));
    }

    @Test
    void rejectsLiveStateWithoutEveryRoomParticipant() throws Exception {
        StartedRoom room = createStartedRoom();

        mockMvc.perform(put("/api/game-rooms/{roomId}/live-state", room.roomId())
                .header(HttpHeaders.AUTHORIZATION, bearer(room.hostToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(singlePlayerLiveStateRequest(room.hostId())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ROOM_009"));
    }

    private StartedRoom createStartedRoom() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        String playerToken = signUpAndLogin("player@example.com", "Player");
        Long hostId = memberId("host@example.com");
        Long playerId = memberId("player@example.com");
        Long roomId = createRoom(hostToken);

        createAcceptedFriendship(hostToken, playerToken, playerId);
        Long invitationId = createLinkedInvitation(hostToken, playerId, roomId);
        acceptInvitation(playerToken, invitationId);
        updateReady(playerToken, roomId);
        startRoom(hostToken, roomId);

        return new StartedRoom(hostToken, playerToken, hostId, playerId, roomId);
    }

    private Long createRoom(String token) throws Exception {
        String response = mockMvc.perform(post("/api/game-rooms")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Live State Match",
                      "gameType": "3-Cushion",
                      "gameMode": "Individual",
                      "playerCapacity": 2,
                      "hostTargetScore": 20
                    }
                    """))
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

    private void updateReady(String token, Long roomId) throws Exception {
        mockMvc.perform(patch("/api/game-rooms/{roomId}/ready", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "ready": true
                    }
                    """))
            .andExpect(status().isOk());
    }

    private void startRoom(String token, Long roomId) throws Exception {
        mockMvc.perform(patch("/api/game-rooms/{roomId}/start", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token)))
            .andExpect(status().isOk());
    }

    private String liveStateRequest(
        long stateVersion,
        int currentInning,
        Long activeMemberId,
        Long hostId,
        Long playerId
    ) {
        return """
            {
              "stateVersion": %d,
              "currentInning": %d,
              "activeMemberId": %d,
              "scores": [
                {
                  "memberId": %d,
                  "currentScore": 3,
                  "cushionScore": 1,
                  "highRun": 2
                },
                {
                  "memberId": %d,
                  "currentScore": 5,
                  "cushionScore": 0,
                  "highRun": 4
                }
              ]
            }
            """.formatted(stateVersion, currentInning, activeMemberId, hostId, playerId);
    }

    private String singlePlayerLiveStateRequest(Long memberId) {
        return """
            {
              "stateVersion": 0,
              "currentInning": 1,
              "activeMemberId": %d,
              "scores": [
                {
                  "memberId": %d,
                  "currentScore": 0,
                  "cushionScore": 0,
                  "highRun": 0
                }
              ]
            }
            """.formatted(memberId, memberId);
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

    private record StartedRoom(
        String hostToken,
        String playerToken,
        Long hostId,
        Long playerId,
        Long roomId
    ) {
    }
}
