package com.my.billiards.game.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum GameType {
	THREE_CUSHION("3-Cushion"),
	FOUR_BALL("4-Ball");

	private final String value;

	GameType(String value) {
		this.value = value;
	}

	@JsonValue
	public String getValue() {
		return value;
	}

	@JsonCreator
	public static GameType from(String value) {
		return Arrays.stream(values())
			.filter(type -> type.value.equals(value))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("지원하지 않는 게임 종류입니다: " + value));
	}
}
