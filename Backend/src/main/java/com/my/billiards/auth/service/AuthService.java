package com.my.billiards.auth.service;

import com.my.billiards.auth.dto.LoginRequest;
import com.my.billiards.auth.dto.LoginResponse;
import com.my.billiards.auth.dto.SignUpRequest;
import com.my.billiards.auth.dto.SignUpResponse;
import com.my.billiards.auth.token.JwtTokenProvider;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final MemberRepository memberRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider jwtTokenProvider;

	@Transactional
	public SignUpResponse signUp(SignUpRequest request) {
		String email = normalizeEmail(request.email());
		if (memberRepository.existsByEmail(email)) {
			throw new BilliardsException(ErrorCode.DUPLICATE_EMAIL);
		}

		Member member = Member.create(
			email,
			passwordEncoder.encode(request.password()),
			request.nickname().strip()
		);

		return SignUpResponse.from(memberRepository.save(member));
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		Member member = memberRepository.findByEmail(normalizeEmail(request.email()))
			.orElseThrow(this::invalidLogin);

		if (!passwordEncoder.matches(request.password(), member.getPasswordHash())) {
			throw invalidLogin();
		}

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return LoginResponse.of(jwtTokenProvider.issue(member), member);
	}

	private String normalizeEmail(String email) {
		return email.strip().toLowerCase(Locale.ROOT);
	}

	private BilliardsException invalidLogin() {
		return new BilliardsException(ErrorCode.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
	}
}
