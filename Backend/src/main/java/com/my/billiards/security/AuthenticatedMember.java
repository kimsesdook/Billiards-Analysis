package com.my.billiards.security;

import com.my.billiards.member.domain.MemberRole;

public record AuthenticatedMember(
	Long id,
	String email,
	MemberRole role
) {
}
