package com.my.billiards.auth.service;

import com.my.billiards.auth.domain.RefreshToken;
import com.my.billiards.auth.repository.RefreshTokenRepository;
import com.my.billiards.auth.token.RefreshTokenCodec;
import com.my.billiards.config.BilliardsProperties;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

	private final RefreshTokenRepository refreshTokenRepository;
	private final RefreshTokenCodec refreshTokenCodec;
	private final BilliardsProperties properties;

	@Transactional
	public IssuedRefreshToken issue(Member member) {
		Instant now = Instant.now();
		return issue(member, UUID.randomUUID().toString(), now);
	}

	@Transactional
	public RotationResult rotate(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			return RotationResult.invalid();
		}

		String tokenHash = refreshTokenCodec.hash(rawToken);
		RefreshToken currentToken = refreshTokenRepository.findByTokenHashForUpdate(tokenHash)
			.orElse(null);

		if (currentToken == null) {
			return RotationResult.invalid();
		}

		Instant now = Instant.now();
		if (!currentToken.isActiveAt(now) || currentToken.getMember().getStatus() != MemberStatus.ACTIVE) {
			revokeFamily(currentToken.getFamilyId(), now);
			return RotationResult.invalid();
		}

		IssuedRefreshToken replacement = issue(currentToken.getMember(), currentToken.getFamilyId(), now);
		currentToken.rotate(refreshTokenCodec.hash(replacement.rawToken()), now);

		return RotationResult.success(
			currentToken.getMember(),
			replacement.rawToken(),
			replacement.expiresInSeconds()
		);
	}

	@Transactional
	public void revokeFamily(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			return;
		}

		refreshTokenRepository.findByTokenHashForUpdate(refreshTokenCodec.hash(rawToken))
			.ifPresent(token -> revokeFamily(token.getFamilyId(), Instant.now()));
	}

	private IssuedRefreshToken issue(Member member, String familyId, Instant now) {
		String rawToken = refreshTokenCodec.generate();
		String tokenHash = refreshTokenCodec.hash(rawToken);
		Instant expiresAt = now.plus(properties.getJwt().getRefreshTokenExpirationDays(), ChronoUnit.DAYS);

		refreshTokenRepository.save(RefreshToken.issue(member, tokenHash, familyId, expiresAt));

		return new IssuedRefreshToken(
			rawToken,
			Duration.between(now, expiresAt).toSeconds()
		);
	}

	private void revokeFamily(String familyId, Instant now) {
		refreshTokenRepository.findAllByFamilyIdForUpdate(familyId)
			.forEach(token -> token.revoke(now));
	}

	public record IssuedRefreshToken(
		String rawToken,
		long expiresInSeconds
	) {
	}

	public record RotationResult(
		boolean rotated,
		Member member,
		String rawToken,
		long expiresInSeconds
	) {

		private static RotationResult success(
			Member member,
			String rawToken,
			long expiresInSeconds
		) {
			return new RotationResult(true, member, rawToken, expiresInSeconds);
		}

		private static RotationResult invalid() {
			return new RotationResult(false, null, null, 0);
		}
	}
}
