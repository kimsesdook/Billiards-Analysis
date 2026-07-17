package com.my.billiards.auth.dto;

import com.my.billiards.auth.token.JwtTokenProvider.TokenIssueResult;
import com.my.billiards.member.domain.Member;

public record LoginResponse(
	String accessToken,
	String tokenType,
	long expiresInSeconds,
	AuthMemberResponse member
) {

	public static LoginResponse of(TokenIssueResult token, Member member) {
		return new LoginResponse(
			token.accessToken(),
			token.tokenType(),
			token.expiresInSeconds(),
			AuthMemberResponse.from(member)
		);
	}
}
