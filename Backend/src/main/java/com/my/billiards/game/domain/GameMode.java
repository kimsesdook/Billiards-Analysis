package com.my.billiards.game.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum GameMode {
	INDIVIDUAL("Individual"),
	TEAM("Team");

	private final String value;

	GameMode(String value) {
		this.value = value;
	}

	@JsonValue
	public String getValue() {
		return value;
	}

	@JsonCreator
	public static GameMode from(String value) {
		return Arrays.stream(values())
			.filter(mode -> mode.value.equals(value))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("지원하지 않는 경기 모드입니다: " + value));
	}
}
