package com.my.billiards.auth.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

@Getter
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@Column(name = "token_hash", nullable = false, length = 64, unique = true)
	private String tokenHash;

	@Column(name = "family_id", nullable = false, length = 36)
	private String familyId;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Column(name = "replaced_by_token_hash", length = 64)
	private String replacedByTokenHash;

	protected RefreshToken() {
	}

	private RefreshToken(Member member, String tokenHash, String familyId, Instant expiresAt) {
		this.member = member;
		this.tokenHash = tokenHash;
		this.familyId = familyId;
		this.expiresAt = expiresAt;
	}

	public static RefreshToken issue(Member member, String tokenHash, String familyId, Instant expiresAt) {
		return new RefreshToken(member, tokenHash, familyId, expiresAt);
	}

	public boolean isActiveAt(Instant now) {
		return revokedAt == null && expiresAt.isAfter(now);
	}

	public void rotate(String replacementTokenHash, Instant now) {
		this.revokedAt = now;
		this.replacedByTokenHash = replacementTokenHash;
	}

	public void revoke(Instant now) {
		if (revokedAt == null) {
			this.revokedAt = now;
		}
	}
}
