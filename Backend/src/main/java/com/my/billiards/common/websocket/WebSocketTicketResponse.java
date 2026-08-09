package com.my.billiards.common.websocket;

public record WebSocketTicketResponse(
	String ticket,
	long expiresInSeconds
) {
}
