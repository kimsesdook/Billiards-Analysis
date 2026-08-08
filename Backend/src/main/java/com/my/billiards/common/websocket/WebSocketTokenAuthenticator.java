package com.my.billiards.common.websocket;

import com.my.billiards.auth.token.JwtTokenProvider;
import com.my.billiards.auth.token.JwtTokenProvider.JwtClaims;
import com.my.billiards.common.error.BilliardsException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class WebSocketTokenAuthenticator {

    private final JwtTokenProvider jwtTokenProvider;

    public Long authenticate(ServerHttpRequest request, ServerHttpResponse response) {
        String token = UriComponentsBuilder.fromUri(request.getURI())
            .build()
            .getQueryParams()
            .getFirst("token");

        if (token == null || token.isBlank()) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return null;
        }

        try {
            JwtClaims claims = jwtTokenProvider.parse(token);
            return claims.memberId();
        } catch (BilliardsException exception) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return null;
        }
    }
}
