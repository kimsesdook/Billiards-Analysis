package com.my.billiards.common.websocket;

public record WebSocketTicketPayload(
	Long memberId,
	WebSocketTicketPurpose purpose,
	Long roomId
) {
}
