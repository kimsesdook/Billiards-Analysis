package com.my.billiards.member.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

@Getter
@Entity
@Table(name = "members")
public class Member extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 255, unique = true)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(nullable = false, length = 30)
	private String nickname;

	@Column(name = "display_name", nullable = false, length = 30)
	private String displayName;

	@Column(name = "target_cushion_count", nullable = false)
	private int targetCushionCount;

	@Column(name = "three_ball_handicap", nullable = false)
	private int threeBallHandicap;

	@Column(name = "four_ball_handicap", nullable = false)
	private int fourBallHandicap;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private MemberRole role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private MemberStatus status;

	protected Member() {
	}

	private Member(String email, String passwordHash, String nickname) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.nickname = nickname;
		this.displayName = nickname;
		this.targetCushionCount = 1;
		this.threeBallHandicap = 200;
		this.fourBallHandicap = 250;
		this.role = MemberRole.USER;
		this.status = MemberStatus.ACTIVE;
	}

	public static Member create(String email, String passwordHash, String nickname) {
		return new Member(email, passwordHash, nickname);
	}

	public void updateProfile(
		String displayName,
		String nickname,
		int targetCushionCount,
		int threeBallHandicap,
		int fourBallHandicap
	) {
		this.displayName = displayName;
		this.nickname = nickname;
		this.targetCushionCount = targetCushionCount;
		this.threeBallHandicap = threeBallHandicap;
		this.fourBallHandicap = fourBallHandicap;
	}

	public void changePassword(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public void grantAdministratorRole() {
		this.role = MemberRole.ADMIN;
	}
}
