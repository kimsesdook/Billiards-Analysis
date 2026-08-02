package com.my.billiards.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
	AI_SERVICE_UNAVAILABLE("AI_001", HttpStatus.SERVICE_UNAVAILABLE, "AI analysis is not configured or temporarily unavailable."),
	AI_ANALYSIS_FAILED("AI_002", HttpStatus.BAD_GATEWAY, "AI analysis could not be generated."),
	INVALID_INPUT_VALUE("COMMON_001", HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
	RESOURCE_NOT_FOUND("COMMON_002", HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
	DUPLICATE_EMAIL("MEMBER_001", HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
	SELF_FRIEND_REQUEST("FRIEND_001", HttpStatus.BAD_REQUEST, "자기 자신에게는 친구 요청을 보낼 수 없습니다."),
	FRIENDSHIP_ALREADY_EXISTS("FRIEND_002", HttpStatus.CONFLICT, "이미 친구이거나 대기 중인 친구 요청이 있습니다."),
	SELF_GAME_INVITATION("INVITATION_001", HttpStatus.BAD_REQUEST, "자기 자신에게는 경기 초대를 보낼 수 없습니다."),
	GAME_INVITATION_ONLY_FOR_FRIENDS("INVITATION_002", HttpStatus.FORBIDDEN, "친구에게만 경기 초대를 보낼 수 있습니다."),
	GAME_INVITATION_ALREADY_PENDING("INVITATION_003", HttpStatus.CONFLICT, "이미 대기 중인 경기 초대가 있습니다."),
	GAME_INVITATION_EXPIRED("INVITATION_004", HttpStatus.CONFLICT, "만료된 경기 초대입니다."),
	GAME_ROOM_NOT_WAITING("ROOM_001", HttpStatus.CONFLICT, "대기 중인 게임방에서만 요청할 수 있습니다."),
	GAME_ROOM_FULL("ROOM_002", HttpStatus.CONFLICT, "게임방 정원이 모두 찼습니다."),
	GAME_ROOM_GAME_TYPE_MISMATCH("ROOM_003", HttpStatus.BAD_REQUEST, "게임방의 경기 종류와 초대 경기 종류가 일치하지 않습니다."),
	GAME_ROOM_ALREADY_JOINED("ROOM_004", HttpStatus.CONFLICT, "이미 게임방에 참가한 회원입니다."),
	UNAUTHORIZED("AUTH_001", HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
	FORBIDDEN("AUTH_002", HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
	INTERNAL_SERVER_ERROR("COMMON_999", HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

	private final String code;
	private final HttpStatus status;
	private final String message;

	ErrorCode(String code, HttpStatus status, String message) {
		this.code = code;
		this.status = status;
		this.message = message;
	}

	public String getCode() {
		return code;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getMessage() {
		return message;
	}
}
