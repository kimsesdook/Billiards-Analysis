package com.my.billiards.common.websocket;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class WebSocketTicketAuthenticator {

	private final WebSocketTicketService ticketService;

	public Long authenticate(
		ServerHttpRequest request,
		ServerHttpResponse response,
		WebSocketTicketPurpose purpose,
		Long roomId
	) {
		String ticket = UriComponentsBuilder.fromUri(request.getURI())
			.build()
			.getQueryParams()
			.getFirst("ticket");

		try {
			Long memberId = ticketService.consume(ticket, purpose, roomId);
			if (memberId == null) {
				response.setStatusCode(HttpStatus.UNAUTHORIZED);
			}
			return memberId;
		} catch (BilliardsException exception) {
			HttpStatus status = exception.getErrorCode() == ErrorCode.REALTIME_SERVICE_UNAVAILABLE
				? HttpStatus.SERVICE_UNAVAILABLE
				: HttpStatus.UNAUTHORIZED;
			response.setStatusCode(status);
			return null;
		}
	}
}
