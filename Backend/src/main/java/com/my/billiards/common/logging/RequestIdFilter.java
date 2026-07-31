package com.my.billiards.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

	public static final String HEADER_NAME = "X-Request-Id";
	private static final String MDC_KEY = "requestId";
	private static final Pattern VALID_REQUEST_ID = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9-]{0,63}$");

	@Override
	protected void doFilterInternal(
		HttpServletRequest request,
		HttpServletResponse response,
		FilterChain filterChain
	) throws ServletException, IOException {
		String requestId = resolveRequestId(request.getHeader(HEADER_NAME));
		MDC.put(MDC_KEY, requestId);
		response.setHeader(HEADER_NAME, requestId);

		try {
			filterChain.doFilter(request, response);
		} finally {
			MDC.remove(MDC_KEY);
		}
	}

	private String resolveRequestId(String requestedRequestId) {
		if (requestedRequestId != null && VALID_REQUEST_ID.matcher(requestedRequestId).matches()) {
			return requestedRequestId;
		}

		return UUID.randomUUID().toString();
	}
}
