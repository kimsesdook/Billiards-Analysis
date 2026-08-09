package com.my.billiards.common.websocket;

import com.my.billiards.config.BilliardsProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketTicketService {

	private static final int TICKET_BYTES = 32;

	private final WebSocketTicketStore ticketStore;
	private final BilliardsProperties properties;
	private final SecureRandom secureRandom = new SecureRandom();

	public WebSocketTicketResponse issue(
		Long memberId,
		WebSocketTicketPurpose purpose,
		Long roomId
	) {
		validateScope(purpose, roomId);
		long expirationSeconds = properties.getWebSocketTicket().getExpirationSeconds();
		if (expirationSeconds <= 0) {
			throw new IllegalStateException("WebSocket ticket expiration must be positive.");
		}

		String ticket = generateTicket();
		ticketStore.save(
			hash(ticket),
			new WebSocketTicketPayload(memberId, purpose, roomId),
			Duration.ofSeconds(expirationSeconds)
		);
		return new WebSocketTicketResponse(ticket, expirationSeconds);
	}

	public Long consume(String ticket, WebSocketTicketPurpose expectedPurpose, Long expectedRoomId) {
		if (ticket == null || ticket.isBlank()) {
			return null;
		}

		return ticketStore.consume(hash(ticket))
			.filter(payload -> payload.purpose() == expectedPurpose)
			.filter(payload -> Objects.equals(payload.roomId(), expectedRoomId))
			.map(WebSocketTicketPayload::memberId)
			.orElse(null);
	}

	private void validateScope(WebSocketTicketPurpose purpose, Long roomId) {
		boolean validNotificationScope = purpose == WebSocketTicketPurpose.NOTIFICATIONS && roomId == null;
		boolean validGameRoomScope = purpose == WebSocketTicketPurpose.GAME_ROOM && roomId != null;
		if (!validNotificationScope && !validGameRoomScope) {
			throw new IllegalArgumentException("Invalid WebSocket ticket scope.");
		}
	}

	private String generateTicket() {
		byte[] bytes = new byte[TICKET_BYTES];
		secureRandom.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hash(String ticket) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(ticket.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is not available.", exception);
		}
	}
}
