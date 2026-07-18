package com.my.billiards.member.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.dto.MemberProfileResponse;
import com.my.billiards.member.dto.MemberProfileUpdateRequest;
import com.my.billiards.member.dto.PasswordChangeRequest;
import com.my.billiards.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberService {

	private final MemberRepository memberRepository;
	private final PasswordEncoder passwordEncoder;

	@Transactional(readOnly = true)
	public MemberProfileResponse getProfile(Long memberId) {
		return MemberProfileResponse.from(getActiveMember(memberId));
	}

	@Transactional
	public MemberProfileResponse updateProfile(Long memberId, MemberProfileUpdateRequest request) {
		Member member = getActiveMember(memberId);
		member.updateProfile(
			request.name().strip(),
			request.nickname().strip(),
			request.targetCushionCount(),
			request.threeBallHandicap(),
			request.fourBallHandicap()
		);

		return MemberProfileResponse.from(member);
	}

	@Transactional
	public void changePassword(Long memberId, PasswordChangeRequest request) {
		Member member = getActiveMember(memberId);
		if (!passwordEncoder.matches(request.currentPassword(), member.getPasswordHash())) {
			throw new BilliardsException(ErrorCode.UNAUTHORIZED, "현재 비밀번호가 일치하지 않습니다.");
		}

		member.changePassword(passwordEncoder.encode(request.newPassword()));
	}

	private Member getActiveMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "회원을 찾을 수 없습니다."));

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}
}
