package com.my.billiards.common.websocket;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("test")
public class InMemoryWebSocketTicketStore implements WebSocketTicketStore {

	private final ConcurrentMap<String, StoredTicket> tickets = new ConcurrentHashMap<>();

	@Override
	public void save(String ticketHash, WebSocketTicketPayload payload, Duration timeToLive) {
		tickets.put(ticketHash, new StoredTicket(payload, Instant.now().plus(timeToLive)));
	}

	@Override
	public Optional<WebSocketTicketPayload> consume(String ticketHash) {
		StoredTicket storedTicket = tickets.remove(ticketHash);
		if (storedTicket == null || !storedTicket.expiresAt().isAfter(Instant.now())) {
			return Optional.empty();
		}
		return Optional.of(storedTicket.payload());
	}

	private record StoredTicket(WebSocketTicketPayload payload, Instant expiresAt) {
	}
}
