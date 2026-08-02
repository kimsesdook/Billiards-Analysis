package com.my.billiards.game.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.my.billiards.contact.repository.ContactInquiryRepository;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.domain.GameRoomStatus;
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
class GameRoomControllerTest {

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
    void rejectGameRoomRequestsWithoutToken() throws Exception {
        mockMvc.perform(get("/api/game-rooms"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.code").value("AUTH_001"));
    }

    @Test
    void createsGameRoomWithHostParticipantAndListsItForHost() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");

        Long roomId = createRoom(hostToken, "Friday Night Match", "3-Cushion", "Individual", 2, 20);

        mockMvc.perform(get("/api/game-rooms/{roomId}", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.roomId").value(roomId))
            .andExpect(jsonPath("$.data.name").value("Friday Night Match"))
            .andExpect(jsonPath("$.data.gameType").value("3-Cushion"))
            .andExpect(jsonPath("$.data.status").value("WAITING"))
            .andExpect(jsonPath("$.data.participants[0].nickname").value("Host"))
            .andExpect(jsonPath("$.data.participants[0].role").value("HOST"))
            .andExpect(jsonPath("$.data.participants[0].ready").value(true));

        mockMvc.perform(get("/api/game-rooms")
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].roomId").value(roomId));

        assertThat(gameRoomRepository.findById(roomId).orElseThrow().getStatus()).isEqualTo(GameRoomStatus.WAITING);
    }

    @Test
    void preventsNonParticipantFromViewingGameRoom() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        String otherToken = signUpAndLogin("other@example.com", "Other");
        Long roomId = createRoom(hostToken, "Private Match", "4-Ball", "Individual", 2, 25);

        mockMvc.perform(get("/api/game-rooms/{roomId}", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.code").value("AUTH_002"));
    }

    @Test
    void hostCancelsWaitingGameRoomAndCannotCancelItAgain() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");
        Long roomId = createRoom(hostToken, "Cancel Match", "3-Cushion", "Individual", 2, 20);

        mockMvc.perform(patch("/api/game-rooms/{roomId}/cancel", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("CANCELED"));

        mockMvc.perform(patch("/api/game-rooms/{roomId}/cancel", roomId)
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("ROOM_001"));
    }

    @Test
    void rejectsTeamRoomWithNonFourPlayerCapacity() throws Exception {
        String hostToken = signUpAndLogin("host@example.com", "Host");

        mockMvc.perform(post("/api/game-rooms")
                .header(HttpHeaders.AUTHORIZATION, bearer(hostToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(roomRequest("Team Match", "3-Cushion", "Team", 2, 20)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("COMMON_001"));
    }

    private Long createRoom(
        String token,
        String name,
        String gameType,
        String gameMode,
        int playerCapacity,
        int hostTargetScore
    ) throws Exception {
        String response = mockMvc.perform(post("/api/game-rooms")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(roomRequest(name, gameType, gameMode, playerCapacity, hostTargetScore)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.joinCode").isNotEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();

        return extractLong(response, "roomId");
    }

    private String roomRequest(
        String name,
        String gameType,
        String gameMode,
        int playerCapacity,
        int hostTargetScore
    ) {
        return """
            {
              "name": "%s",
              "gameType": "%s",
              "gameMode": "%s",
              "playerCapacity": %d,
              "hostTargetScore": %d
            }
            """.formatted(name, gameType, gameMode, playerCapacity, hostTargetScore);
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
