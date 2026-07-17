package com.my.billiards.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.auth.token.JwtTokenProvider;
import com.my.billiards.auth.token.JwtTokenProvider.JwtClaims;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.common.error.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private static final String BEARER_PREFIX = "Bearer ";

	private final JwtTokenProvider jwtTokenProvider;
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Override
	protected void doFilterInternal(
		HttpServletRequest request,
		HttpServletResponse response,
		FilterChain filterChain
	) throws ServletException, IOException {
		String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (authorization == null || authorization.isBlank()) {
			filterChain.doFilter(request, response);
			return;
		}

		if (!authorization.startsWith(BEARER_PREFIX)) {
			writeUnauthorized(response);
			return;
		}

		try {
			JwtClaims claims = jwtTokenProvider.parse(authorization.substring(BEARER_PREFIX.length()));
			AuthenticatedMember principal = new AuthenticatedMember(
				claims.memberId(),
				claims.email(),
				claims.role()
			);
			UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
				principal,
				null,
				List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name()))
			);
			authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
			SecurityContextHolder.getContext().setAuthentication(authentication);

			filterChain.doFilter(request, response);
		} catch (BilliardsException exception) {
			SecurityContextHolder.clearContext();
			writeUnauthorized(response);
		}
	}

	private void writeUnauthorized(HttpServletResponse response) throws IOException {
		response.setStatus(ErrorCode.UNAUTHORIZED.getStatus().value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		objectMapper.writeValue(response.getWriter(), ErrorResponse.of(ErrorCode.UNAUTHORIZED));
	}
}
