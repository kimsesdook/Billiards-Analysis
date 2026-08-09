package com.my.billiards.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;

import com.my.billiards.config.BilliardsProperties;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WebSocketTicketServiceTest {

	private InMemoryWebSocketTicketStore ticketStore;
	private WebSocketTicketService ticketService;

	@BeforeEach
	void setUp() {
		BilliardsProperties properties = new BilliardsProperties();
		properties.getWebSocketTicket().setExpirationSeconds(30);
		ticketStore = new InMemoryWebSocketTicketStore();
		ticketService = new WebSocketTicketService(ticketStore, properties);
	}

	@Test
	void consumesIssuedTicketOnlyOnce() {
		WebSocketTicketResponse response = ticketService.issue(
			10L,
			WebSocketTicketPurpose.NOTIFICATIONS,
			null
		);

		assertThat(response.ticket()).isNotBlank();
		assertThat(response.expiresInSeconds()).isEqualTo(30);
		assertThat(ticketService.consume(
			response.ticket(),
			WebSocketTicketPurpose.NOTIFICATIONS,
			null
		)).isEqualTo(10L);
		assertThat(ticketService.consume(
			response.ticket(),
			WebSocketTicketPurpose.NOTIFICATIONS,
			null
		)).isNull();
	}

	@Test
	void rejectsAndConsumesTicketUsedForWrongRoom() {
		WebSocketTicketResponse response = ticketService.issue(
			10L,
			WebSocketTicketPurpose.GAME_ROOM,
			7L
		);

		assertThat(ticketService.consume(
			response.ticket(),
			WebSocketTicketPurpose.GAME_ROOM,
			8L
		)).isNull();
		assertThat(ticketService.consume(
			response.ticket(),
			WebSocketTicketPurpose.GAME_ROOM,
			7L
		)).isNull();
	}

	@Test
	void rejectsExpiredStoredTicket() {
		ticketStore.save(
			"expired-ticket-hash",
			new WebSocketTicketPayload(10L, WebSocketTicketPurpose.NOTIFICATIONS, null),
			Duration.ZERO
		);

		assertThat(ticketStore.consume("expired-ticket-hash")).isEmpty();
	}
}
