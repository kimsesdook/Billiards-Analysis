package com.my.billiards.mcp;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.auth.token.JwtTokenProvider;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.repository.MemberRepository;
import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import io.modelcontextprotocol.spec.McpSchema;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class McpProtocolIntegrationTest {

	private static final String MCP_ENDPOINT = "/mcp";

	@LocalServerPort
	private int port;

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private GameRecordRepository gameRecordRepository;

	@Autowired
	private JwtTokenProvider jwtTokenProvider;

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Test
	void rejectsMcpInitializationWithoutJwt() throws Exception {
		String initializeRequest = """
			{
			  "jsonrpc": "2.0",
			  "id": 1,
			  "method": "initialize",
			  "params": {
			    "protocolVersion": "2025-06-18",
			    "capabilities": {},
			    "clientInfo": {"name": "security-test", "version": "1.0.0"}
			  }
			}
			""";

		HttpRequest request = HttpRequest.newBuilder(mcpUri())
			.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
			.header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE + ", text/event-stream")
			.POST(HttpRequest.BodyPublishers.ofString(initializeRequest))
			.build();

		HttpResponse<String> response = HttpClient.newHttpClient()
			.send(request, HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(401);
	}

	@Test
	void initializesListsToolsAndReturnsOnlyAuthenticatedMembersData() throws Exception {
		String uniqueId = UUID.randomUUID().toString().substring(0, 8);
		Member owner = saveMember("mcp-owner-" + uniqueId, "McpOwner");
		Member otherMember = saveMember("mcp-other-" + uniqueId, "McpOther");
		saveGame(owner, "Visible Opponent", 15, 12);
		saveGame(otherMember, "Hidden Opponent", 100, 1);

		String accessToken = jwtTokenProvider.issue(owner).accessToken();

		try (McpSyncClient client = authenticatedClient(accessToken)) {
			McpSchema.InitializeResult initializeResult = client.initialize();
			assertThat(initializeResult.serverInfo().name()).isEqualTo("billiards-report-mcp");

			McpSchema.ListToolsResult toolsResult = client.listTools();
			assertThat(toolsResult.tools())
				.extracting(McpSchema.Tool::name)
				.containsExactlyInAnyOrder(
					"get_weekly_game_report",
					"get_recent_game_statistics",
					"get_opponent_statistics"
				);
			assertThat(toolsResult.tools()).allSatisfy(tool -> {
				assertThat(tool.annotations().readOnlyHint()).isTrue();
				assertThat(tool.annotations().destructiveHint()).isFalse();
			});

			McpSchema.CallToolResult statisticsResult = client.callTool(McpSchema.CallToolRequest
				.builder("get_recent_game_statistics")
				.arguments(Map.of("gameType", "3-Cushion", "recentGameCount", 10))
				.build());
			JsonNode statistics = resultPayload(statisticsResult);
			assertThat(statistics.path("totalGames").asInt()).isEqualTo(1);
			assertThat(statistics.path("totalPoints").asInt()).isEqualTo(15);

			McpSchema.CallToolResult weeklyResult = client.callTool(McpSchema.CallToolRequest
				.builder("get_weekly_game_report")
				.arguments(Map.of("gameType", "3-Cushion"))
				.build());
			assertThat(resultPayload(weeklyResult).path("type").asText()).isEqualTo("3-Cushion");

			McpSchema.CallToolResult opponentsResult = client.callTool(McpSchema.CallToolRequest
				.builder("get_opponent_statistics")
				.arguments(Map.of())
				.build());
			String opponents = resultPayload(opponentsResult).toString();
			assertThat(opponents)
				.contains("Visible Opponent")
				.doesNotContain("Hidden Opponent");
		}
	}

	private McpSyncClient authenticatedClient(String accessToken) {
		HttpClientStreamableHttpTransport transport = HttpClientStreamableHttpTransport.builder(baseUrl())
			.endpoint(MCP_ENDPOINT)
			.httpRequestCustomizer((request, method, uri, body, context) ->
				request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
			.build();

		return McpClient.sync(transport)
			.clientInfo(McpSchema.Implementation.builder("billiards-integration-test", "1.0.0").build())
			.initializationTimeout(Duration.ofSeconds(10))
			.requestTimeout(Duration.ofSeconds(10))
			.build();
	}

	private Member saveMember(String emailPrefix, String nickname) {
		return memberRepository.save(Member.create(emailPrefix + "@example.com", "unused-password-hash", nickname));
	}

	private void saveGame(Member member, String opponentName, int myScore, int opponentScore) {
		gameRecordRepository.save(GameRecord.create(
			member,
			OffsetDateTime.parse("2026-08-15T10:00:00Z"),
			GameType.THREE_CUSHION,
			GameMode.INDIVIDUAL,
			myScore,
			opponentScore,
			10,
			5,
			2,
			null,
			null,
			null,
			opponentName,
			List.of(),
			null,
			null
		));
	}

	private JsonNode resultPayload(McpSchema.CallToolResult result) throws Exception {
		assertThat(result.isError()).isNotEqualTo(true);
		if (result.structuredContent() != null) {
			return objectMapper.valueToTree(result.structuredContent());
		}

		assertThat(result.content()).hasSize(1);
		assertThat(result.content().get(0)).isInstanceOf(McpSchema.TextContent.class);
		McpSchema.TextContent content = (McpSchema.TextContent) result.content().get(0);
		return objectMapper.readTree(content.text());
	}

	private URI mcpUri() {
		return URI.create(baseUrl() + MCP_ENDPOINT);
	}

	private String baseUrl() {
		return "http://localhost:" + port;
	}
}
