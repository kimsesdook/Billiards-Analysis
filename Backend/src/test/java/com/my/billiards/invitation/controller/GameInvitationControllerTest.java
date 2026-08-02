package com.my.billiards.invitation.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.game.repository.GameRoomParticipantRepository;
import com.my.billiards.game.repository.GameRoomRepository;
import com.my.billiards.invitation.domain.GameInvitationStatus;
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
class GameInvitationControllerTest {

	private static final String PASSWORD = "password123";

	@Autowired
	private MockMvc mockMvc;

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
	private GameRecordRepository gameRecordRepository;

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
		gameRoomParticipantRepository.deleteAll();
		gameRoomRepository.deleteAll();
		friendshipRepository.deleteAll();
		memberRepository.deleteAll();
	}

	@Test
	void rejectFindInvitationsWithoutToken() throws Exception {
		mockMvc.perform(get("/api/game-invitations"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void rejectInvitationForNonFriend() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberId("receiver@example.com");

		mockMvc.perform(post("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(requesterToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(invitationRequest(receiverId, "3-Cushion")))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("INVITATION_002"));
	}

	@Test
	void createInvitationAndListIncomingAndOutgoingInvitations() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberId("receiver@example.com");
		createAcceptedFriendship(requesterToken, receiverToken, receiverId);

		Long invitationId = createInvitation(requesterToken, receiverId, "3-Cushion");

		mockMvc.perform(get("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(requesterToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.outgoing[0].invitationId").value(invitationId))
			.andExpect(jsonPath("$.data.outgoing[0].member.nickname").value("Receiver"))
			.andExpect(jsonPath("$.data.outgoing[0].gameType").value("3-Cushion"))
			.andExpect(jsonPath("$.data.outgoing[0].status").value("PENDING"));

		mockMvc.perform(get("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.incoming[0].invitationId").value(invitationId))
			.andExpect(jsonPath("$.data.incoming[0].member.nickname").value("Requester"))
			.andExpect(jsonPath("$.data.incoming[0].direction").value("INCOMING"));
	}

	@Test
	void receiverAcceptsInvitationAndItLeavesPendingList() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberId("receiver@example.com");
		createAcceptedFriendship(requesterToken, receiverToken, receiverId);
		Long invitationId = createInvitation(requesterToken, receiverId, "4-Ball");

		mockMvc.perform(patch("/api/game-invitations/{invitationId}/accept", invitationId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.status").value("ACCEPTED"))
			.andExpect(jsonPath("$.data.gameType").value("4-Ball"));

		mockMvc.perform(get("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.incoming").isEmpty());

		assertThat(gameInvitationRepository.findById(invitationId).orElseThrow().getStatus())
			.isEqualTo(GameInvitationStatus.ACCEPTED);
	}

	@Test
	void receiverAcceptingLinkedInvitationJoinsGameRoom() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberId("receiver@example.com");
		createAcceptedFriendship(requesterToken, receiverToken, receiverId);
		Long gameRoomId = createGameRoom(requesterToken, "3-Cushion");
		Long invitationId = createInvitation(requesterToken, receiverId, "3-Cushion", gameRoomId);

		mockMvc.perform(patch("/api/game-invitations/{invitationId}/accept", invitationId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.status").value("ACCEPTED"))
			.andExpect(jsonPath("$.data.gameRoomId").value(gameRoomId));

		mockMvc.perform(get("/api/game-rooms/{roomId}", gameRoomId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.participants.length()").value(2))
			.andExpect(jsonPath("$.data.participants[1].nickname").value("Receiver"))
			.andExpect(jsonPath("$.data.participants[1].role").value("PLAYER"))
			.andExpect(jsonPath("$.data.participants[1].targetScore").value(20))
			.andExpect(jsonPath("$.data.participants[1].ready").value(false));
	}

	@Test
	void rejectsLinkedInvitationWhenGameTypesDoNotMatch() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberId("receiver@example.com");
		createAcceptedFriendship(requesterToken, receiverToken, receiverId);
		Long gameRoomId = createGameRoom(requesterToken, "3-Cushion");

		mockMvc.perform(post("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(requesterToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(invitationRequest(receiverId, "4-Ball", gameRoomId)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("ROOM_003"));
	}

	@Test
	void rejectInvitationResponseByMemberWhoIsNotReceiver() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		String otherToken = signUpAndLogin("other@example.com", "Other");
		Long receiverId = memberId("receiver@example.com");
		createAcceptedFriendship(requesterToken, receiverToken, receiverId);
		Long invitationId = createInvitation(requesterToken, receiverId, "3-Cushion");

		mockMvc.perform(patch("/api/game-invitations/{invitationId}/accept", invitationId)
				.header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("AUTH_002"));
	}

	@Test
	void declineInvitationAndAllowNewInvitationAfterward() throws Exception {
		String requesterToken = signUpAndLogin("requester@example.com", "Requester");
		String receiverToken = signUpAndLogin("receiver@example.com", "Receiver");
		Long receiverId = memberId("receiver@example.com");
		createAcceptedFriendship(requesterToken, receiverToken, receiverId);
		Long invitationId = createInvitation(requesterToken, receiverId, "3-Cushion");

		mockMvc.perform(post("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(requesterToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(invitationRequest(receiverId, "3-Cushion")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("INVITATION_003"));

		mockMvc.perform(patch("/api/game-invitations/{invitationId}/decline", invitationId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.status").value("DECLINED"));

		createInvitation(requesterToken, receiverId, "3-Cushion");
	}

	private void createAcceptedFriendship(String requesterToken, String receiverToken, Long receiverId) throws Exception {
		String response = mockMvc.perform(post("/api/friends/requests")
				.header(HttpHeaders.AUTHORIZATION, bearer(requesterToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "targetMemberId": %d
					}
					""".formatted(receiverId)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();

		Long friendshipId = extractLong(response, "requestId");
		mockMvc.perform(patch("/api/friends/requests/{requestId}/accept", friendshipId)
				.header(HttpHeaders.AUTHORIZATION, bearer(receiverToken)))
			.andExpect(status().isOk());
	}

	private Long createInvitation(String token, Long receiverId, String gameType) throws Exception {
		return createInvitation(token, receiverId, gameType, null);
	}

	private Long createInvitation(String token, Long receiverId, String gameType, Long gameRoomId) throws Exception {
		String response = mockMvc.perform(post("/api/game-invitations")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content(invitationRequest(receiverId, gameType, gameRoomId)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "invitationId");
	}

	private String invitationRequest(Long receiverId, String gameType) {
		return invitationRequest(receiverId, gameType, null);
	}

	private String invitationRequest(Long receiverId, String gameType, Long gameRoomId) {
		if (gameRoomId != null) {
			return """
				{
				  "receiverMemberId": %d,
				  "gameType": "%s",
				  "gameRoomId": %d
				}
				""".formatted(receiverId, gameType, gameRoomId);
		}

		return """
			{
			  "receiverMemberId": %d,
			  "gameType": "%s"
			}
			""".formatted(receiverId, gameType);
	}

	private Long createGameRoom(String token, String gameType) throws Exception {
		String response = mockMvc.perform(post("/api/game-rooms")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "name": "Invitation Room",
					  "gameType": "%s",
					  "gameMode": "Individual",
					  "playerCapacity": 2,
					  "hostTargetScore": 20
					}
					""".formatted(gameType)))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "roomId");
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
}
