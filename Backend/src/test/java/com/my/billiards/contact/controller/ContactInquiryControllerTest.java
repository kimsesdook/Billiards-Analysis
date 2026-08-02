package com.my.billiards.contact.controller;

import com.my.billiards.contact.repository.ContactInquiryRepository;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notice.repository.NoticeRepository;
import com.my.billiards.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContactInquiryControllerTest {

	private static final String PASSWORD = "password123";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ContactInquiryRepository contactInquiryRepository;

	@Autowired
	private GameRecordRepository gameRecordRepository;

	@Autowired
	private NotificationRepository notificationRepository;

	@Autowired
	private FriendshipRepository friendshipRepository;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private NoticeRepository noticeRepository;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@BeforeEach
	void setUp() {
		noticeRepository.deleteAll();
		contactInquiryRepository.deleteAll();
		gameRecordRepository.deleteAll();
		notificationRepository.deleteAll();
		friendshipRepository.deleteAll();
		memberRepository.deleteAll();
	}

	@Test
	void createsInquiryAndReturnsItInMyInquiryList() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");
		Long inquiryId = createInquiry(token, "Handicap question", "How is the handicap calculated?", true);

		mockMvc.perform(get("/api/contact-inquiries/me")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(1)))
			.andExpect(jsonPath("$.data[0].id").value(inquiryId))
			.andExpect(jsonPath("$.data[0].title").value("Handicap question"))
			.andExpect(jsonPath("$.data[0].isPrivate").value(true))
			.andExpect(jsonPath("$.data[0].content").doesNotExist())
			.andExpect(jsonPath("$.data[0].status").value("PENDING"));

		mockMvc.perform(get("/api/contact-inquiries/{inquiryId}", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content").value("How is the handicap calculated?"));
	}

	@Test
	void exposesOnlyPublicInquiriesWithoutAuthentication() throws Exception {
		String publicToken = signUpAndLogin("public@example.com", "PublicPlayer");
		String privateToken = signUpAndLogin("private@example.com", "PrivatePlayer");
		Long publicInquiryId = createInquiry(publicToken, "Public question", "Public content", false);
		Long privateInquiryId = createInquiry(privateToken, "Private question", "Private content", true);

		mockMvc.perform(get("/api/contact-inquiries"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(1)))
			.andExpect(jsonPath("$.data[0].id").value(publicInquiryId))
			.andExpect(jsonPath("$.data[0].authorNickname").value("PublicPlayer"))
			.andExpect(jsonPath("$.data[0].isPrivate").value(false))
			.andExpect(jsonPath("$.data[0].content").doesNotExist());

		mockMvc.perform(get("/api/contact-inquiries/{inquiryId}", publicInquiryId))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content").value("Public content"));

		mockMvc.perform(get("/api/contact-inquiries/{inquiryId}", privateInquiryId))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("COMMON_002"));
	}

	@Test
	void preventsOtherMembersFromReadingPrivateInquiry() throws Exception {
		String ownerToken = signUpAndLogin("owner@example.com", "Owner");
		String otherToken = signUpAndLogin("other@example.com", "Other");
		Long inquiryId = createInquiry(ownerToken, "Private inquiry", "Only owner can read this", true);

		mockMvc.perform(get("/api/contact-inquiries/{inquiryId}", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("COMMON_002"));
	}

	@Test
	void requiresAuthenticationForCreatingOrListingMyInquiries() throws Exception {
		mockMvc.perform(post("/api/contact-inquiries")
				.contentType(MediaType.APPLICATION_JSON)
				.content(inquiryJson("No token", "This request has no token", true)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTH_001"));

		mockMvc.perform(get("/api/contact-inquiries/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTH_001"));
	}

	@Test
	void rejectsInvalidInquiryRequest() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(post("/api/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "title": "",
					  "content": "",
					  "isPrivate": null
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	@Test
	void letsAnAdminPageAllInquiriesByStatus() throws Exception {
		String firstOwnerToken = signUpAndLogin("first@example.com", "FirstOwner");
		String secondOwnerToken = signUpAndLogin("second@example.com", "SecondOwner");
		Long firstInquiryId = createInquiry(firstOwnerToken, "First inquiry", "First content", false);
		Long secondInquiryId = createInquiry(secondOwnerToken, "Second inquiry", "Second content", true);
		String adminToken = createAdminToken("admin@example.com", "Administrator");

		mockMvc.perform(get("/api/admin/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.param("status", "PENDING")
				.param("page", "0")
				.param("size", "1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.content", hasSize(1)))
			.andExpect(jsonPath("$.data.content[0].id").value(secondInquiryId))
			.andExpect(jsonPath("$.data.content[0].isPrivate").value(true))
			.andExpect(jsonPath("$.data.content[0].content").doesNotExist())
			.andExpect(jsonPath("$.data.page").value(0))
			.andExpect(jsonPath("$.data.size").value(1))
			.andExpect(jsonPath("$.data.totalElements").value(2))
			.andExpect(jsonPath("$.data.totalPages").value(2))
			.andExpect(jsonPath("$.data.hasNext").value(true));

		mockMvc.perform(get("/api/admin/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.param("status", "ANSWERED"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content").isEmpty());

		mockMvc.perform(get("/api/admin/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.param("status", "INVALID"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_001"));

		mockMvc.perform(get("/api/contact-inquiries/{inquiryId}", firstInquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content").value("First content"));
	}

	@Test
	void preventsRegularMembersFromListingAdminInquiries() throws Exception {
		String token = signUpAndLogin("player@example.com", "PlayerOne");

		mockMvc.perform(get("/api/admin/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isForbidden());
	}

	@Test
	void rechecksAdministratorRoleFromTheDatabase() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");
		jdbcTemplate.update("UPDATE members SET role = ? WHERE email = ?", "USER", "admin@example.com");

		mockMvc.perform(get("/api/admin/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("AUTH_002"));
	}

	@Test
	void letsAnAdminAnswerAnInquiryAndUpdatesItsStatus() throws Exception {
		String ownerToken = signUpAndLogin("owner@example.com", "Owner");
		Long inquiryId = createInquiry(ownerToken, "Handicap question", "How is the handicap calculated?", true);
		String adminToken = createAdminToken("admin@example.com", "Administrator");

		mockMvc.perform(patch("/api/contact-inquiries/{inquiryId}/answer", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "answerContent": "The handicap is calculated from recent game records."
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.status").value("ANSWERED"))
			.andExpect(jsonPath("$.data.answerContent").value("The handicap is calculated from recent game records."))
			.andExpect(jsonPath("$.data.answeredByNickname").value("Administrator"))
			.andExpect(jsonPath("$.data.answeredAt").exists());

		mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data", hasSize(1)))
			.andExpect(jsonPath("$.data[0].type").value("SYSTEM"))
			.andExpect(jsonPath("$.data[0].relatedResourceType").value("CONTACT_INQUIRY"))
			.andExpect(jsonPath("$.data[0].relatedResourceId").value(inquiryId));

		mockMvc.perform(patch("/api/contact-inquiries/{inquiryId}/answer", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "answerContent": "The calculation details have been updated."
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.status").value("ANSWERED"))
			.andExpect(jsonPath("$.data.answerContent").value("The calculation details have been updated."));

		mockMvc.perform(get("/api/notifications")
				.header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data", hasSize(1)));

		mockMvc.perform(get("/api/contact-inquiries/{inquiryId}", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(ownerToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.status").value("ANSWERED"))
			.andExpect(jsonPath("$.data.answerContent").value("The calculation details have been updated."));
	}

	@Test
	void preventsRegularMembersFromAnsweringAnInquiry() throws Exception {
		String ownerToken = signUpAndLogin("owner@example.com", "Owner");
		String regularMemberToken = signUpAndLogin("player@example.com", "PlayerOne");
		Long inquiryId = createInquiry(ownerToken, "Private inquiry", "Only the owner can read this", true);

		mockMvc.perform(patch("/api/contact-inquiries/{inquiryId}/answer", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(regularMemberToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "answerContent": "This must not be accepted."
					}
					"""))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("AUTH_002"));
	}

	@Test
	void rejectsAnEmptyAnswerFromAnAdmin() throws Exception {
		String ownerToken = signUpAndLogin("owner@example.com", "Owner");
		Long inquiryId = createInquiry(ownerToken, "Public inquiry", "Public content", false);
		String adminToken = createAdminToken("admin@example.com", "Administrator");

		mockMvc.perform(patch("/api/contact-inquiries/{inquiryId}/answer", inquiryId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "answerContent": ""
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	private Long createInquiry(String token, String title, String content, boolean isPrivate) throws Exception {
		String response = mockMvc.perform(post("/api/contact-inquiries")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content(inquiryJson(title, content, isPrivate)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "id");
	}

	private String inquiryJson(String title, String content, boolean isPrivate) {
		return """
			{
			  "title": "%s",
			  "content": "%s",
			  "isPrivate": %s
			}
			""".formatted(title, content, isPrivate);
	}

	private String signUpAndLogin(String email, String nickname) throws Exception {
		signUp(email, nickname);
		return login(email);
	}

	private String createAdminToken(String email, String nickname) throws Exception {
		signUp(email, nickname);
		jdbcTemplate.update("UPDATE members SET role = ? WHERE email = ?", "ADMIN", email);
		return login(email);
	}

	private void signUp(String email, String nickname) throws Exception {
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
	}

	private String login(String email) throws Exception {
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
