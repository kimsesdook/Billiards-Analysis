package com.my.billiards.game.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.my.billiards.member.domain.Member;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class GameRoomTest {

    @Test
    void createsWaitingRoomWithHostAsReadyParticipant() {
        Member host = Member.create("host@example.com", "password-hash", "Host");

        GameRoom gameRoom = GameRoom.create(
            host,
            "Friday Night Match",
            "AB12CD34",
            GameType.THREE_CUSHION,
            GameMode.INDIVIDUAL,
            2,
            20
        );

        assertThat(gameRoom.getStatus()).isEqualTo(GameRoomStatus.WAITING);
        assertThat(gameRoom.getParticipants()).hasSize(1);
        assertThat(gameRoom.getParticipants().get(0).getRole()).isEqualTo(GameRoomParticipantRole.HOST);
        assertThat(gameRoom.getParticipants().get(0).isReady()).isTrue();
        assertThat(gameRoom.getParticipants().get(0).getTargetScore()).isEqualTo(20);
    }

    @Test
    void cancelsWaitingRoom() {
        GameRoom gameRoom = GameRoom.create(
            Member.create("host@example.com", "password-hash", "Host"),
            "Friday Night Match",
            "AB12CD34",
            GameType.FOUR_BALL,
            GameMode.INDIVIDUAL,
            2,
            25
        );

        gameRoom.cancel();

        assertThat(gameRoom.getStatus()).isEqualTo(GameRoomStatus.CANCELED);
    }

    @Test
    void startsFullRoomAfterEveryParticipantIsReady() {
        Member host = Member.create("host@example.com", "password-hash", "Host");
        Member player = Member.create("player@example.com", "password-hash", "Player");
        ReflectionTestUtils.setField(host, "id", 1L);
        ReflectionTestUtils.setField(player, "id", 2L);
        GameRoom gameRoom = GameRoom.create(
            host,
            "Friday Night Match",
            "AB12CD34",
            GameType.THREE_CUSHION,
            GameMode.INDIVIDUAL,
            2,
            20
        );

        gameRoom.addPlayer(player, 18);

        assertThat(gameRoom.hasAllParticipants()).isTrue();
        assertThat(gameRoom.areAllParticipantsReady()).isFalse();

        gameRoom.updateParticipantReady(player.getId(), true);
        gameRoom.start();

        assertThat(gameRoom.areAllParticipantsReady()).isTrue();
        assertThat(gameRoom.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
    }
}
