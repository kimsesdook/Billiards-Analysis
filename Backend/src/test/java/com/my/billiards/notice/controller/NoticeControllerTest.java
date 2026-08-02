package com.my.billiards.notice.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.my.billiards.contact.repository.ContactInquiryRepository;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.game.repository.GameRecordRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NoticeControllerTest {

	private static final String PASSWORD = "password123";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private NoticeRepository noticeRepository;

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
	void exposesPublicNoticeSummariesWithImportantNoticesFirst() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");
		Long regularNoticeId = createNotice(
			adminToken,
			"Service update",
			"The game record screen has been improved.",
			"UPDATE",
			false
		);
		Long importantNoticeId = createNotice(
			adminToken,
			"Scheduled maintenance",
			"Service will be unavailable for one hour.",
			"NOTICE",
			true
		);

		mockMvc.perform(get("/api/notices").param("page", "0").param("size", "1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.content", hasSize(1)))
			.andExpect(jsonPath("$.data.content[0].id").value(importantNoticeId))
			.andExpect(jsonPath("$.data.content[0].category").value("NOTICE"))
			.andExpect(jsonPath("$.data.content[0].isImportant").value(true))
			.andExpect(jsonPath("$.data.content[0].content").doesNotExist())
			.andExpect(jsonPath("$.data.page").value(0))
			.andExpect(jsonPath("$.data.size").value(1))
			.andExpect(jsonPath("$.data.totalElements").value(2))
			.andExpect(jsonPath("$.data.totalPages").value(2))
			.andExpect(jsonPath("$.data.hasNext").value(true));

		mockMvc.perform(get("/api/notices/{noticeId}", regularNoticeId))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.title").value("Service update"))
			.andExpect(jsonPath("$.data.content").value("The game record screen has been improved."))
			.andExpect(jsonPath("$.data.isImportant").value(false))
			.andExpect(jsonPath("$.data.publishedAt").exists());
	}

	@Test
	void letsAnAdministratorUpdateAnExistingNotice() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");
		Long noticeId = createNotice(
			adminToken,
			"Old event",
			"Old content",
			"EVENT",
			false
		);

		mockMvc.perform(patch("/api/admin/notices/{noticeId}", noticeId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(noticeJson("Release update", "Updated notice content", "UPDATE", true)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.title").value("Release update"))
			.andExpect(jsonPath("$.data.content").value("Updated notice content"))
			.andExpect(jsonPath("$.data.category").value("UPDATE"))
			.andExpect(jsonPath("$.data.isImportant").value(true));

		mockMvc.perform(get("/api/notices/{noticeId}", noticeId))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.title").value("Release update"));
	}

	@Test
	void softDeletesANoticeWithoutRemovingItsAuditRecord() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");
		Long noticeId = createNotice(
			adminToken,
			"Scheduled maintenance",
			"The service will be unavailable for one hour.",
			"NOTICE",
			true
		);

		mockMvc.perform(delete("/api/admin/notices/{noticeId}", noticeId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/notices"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content").isEmpty())
			.andExpect(jsonPath("$.data.totalElements").value(0));

		mockMvc.perform(get("/api/notices/{noticeId}", noticeId))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("COMMON_002"));

		mockMvc.perform(patch("/api/admin/notices/{noticeId}", noticeId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(noticeJson("Restored title", "This must not restore the notice.", "NOTICE", false)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("COMMON_002"));

		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notices WHERE id = ?", Integer.class, noticeId))
			.isEqualTo(1);
		assertThat(jdbcTemplate.queryForObject("SELECT deleted_at FROM notices WHERE id = ?", Object.class, noticeId))
			.isNotNull();
		assertThat(jdbcTemplate.queryForObject("SELECT deleted_by_member_id FROM notices WHERE id = ?", Object.class, noticeId))
			.isNotNull();
	}

	@Test
	void preventsRegularMembersFromPublishingOrUpdatingNotices() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");
		Long noticeId = createNotice(adminToken, "Service update", "Content", "UPDATE", false);
		String memberToken = signUpAndLogin("member@example.com", "Member");

		mockMvc.perform(post("/api/admin/notices")
				.header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(noticeJson("Unauthorized", "This must not be published.", "NOTICE", false)))
			.andExpect(status().isForbidden());

		mockMvc.perform(patch("/api/admin/notices/{noticeId}", noticeId)
				.header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(noticeJson("Unauthorized", "This must not be updated.", "NOTICE", false)))
			.andExpect(status().isForbidden());

		mockMvc.perform(delete("/api/admin/notices/{noticeId}", noticeId)
				.header(HttpHeaders.AUTHORIZATION, bearer(memberToken)))
			.andExpect(status().isForbidden());
	}

	@Test
	void rechecksAdministratorRoleFromTheDatabaseBeforePublishing() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");
		Long noticeId = createNotice(adminToken, "Role check", "The database role is authoritative.", "NOTICE", true);
		jdbcTemplate.update("UPDATE members SET role = ? WHERE email = ?", "USER", "admin@example.com");

		mockMvc.perform(post("/api/admin/notices")
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content(noticeJson("Role check", "The database role is authoritative.", "NOTICE", true)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("AUTH_002"));

		mockMvc.perform(delete("/api/admin/notices/{noticeId}", noticeId)
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("AUTH_002"));
	}

	@Test
	void rejectsInvalidNoticeAndPageRequests() throws Exception {
		String adminToken = createAdminToken("admin@example.com", "Administrator");

		mockMvc.perform(post("/api/admin/notices")
				.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "title": "",
					  "content": "",
					  "category": null,
					  "isImportant": null
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_001"));

		mockMvc.perform(get("/api/notices").param("page", "-1"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("COMMON_001"));
	}

	private Long createNotice(String token, String title, String content, String category, boolean isImportant) throws Exception {
		String response = mockMvc.perform(post("/api/admin/notices")
				.header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content(noticeJson(title, content, category, isImportant)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andReturn()
			.getResponse()
			.getContentAsString();

		return extractLong(response, "id");
	}

	private String noticeJson(String title, String content, String category, boolean isImportant) {
		return """
			{
			  "title": "%s",
			  "content": "%s",
			  "category": "%s",
			  "isImportant": %s
			}
			""".formatted(title, content, category, isImportant);
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
