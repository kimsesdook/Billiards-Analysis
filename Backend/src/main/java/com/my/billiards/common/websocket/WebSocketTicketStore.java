package com.my.billiards.common.websocket;

import java.time.Duration;
import java.util.Optional;

public interface WebSocketTicketStore {

	void save(String ticketHash, WebSocketTicketPayload payload, Duration timeToLive);

	Optional<WebSocketTicketPayload> consume(String ticketHash);
}
