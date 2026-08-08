package com.my.billiards.game.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;

@Getter
@Entity
@Table(name = "game_room_participants")
public class GameRoomParticipant extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_room_id", nullable = false)
    private GameRoom gameRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_role", nullable = false, length = 30)
    private GameRoomParticipantRole role;

    @Column(name = "target_score", nullable = false)
    private int targetScore;

    @Column(name = "is_ready", nullable = false)
    private boolean ready;

    protected GameRoomParticipant() {
    }

    private GameRoomParticipant(
        GameRoom gameRoom,
        Member member,
        GameRoomParticipantRole role,
        int targetScore,
        boolean ready
    ) {
        this.gameRoom = gameRoom;
        this.member = member;
        this.role = role;
        this.targetScore = targetScore;
        this.ready = ready;
    }

    static GameRoomParticipant host(GameRoom gameRoom, Member member, int targetScore) {
        return new GameRoomParticipant(gameRoom, member, GameRoomParticipantRole.HOST, targetScore, true);
    }

    static GameRoomParticipant player(GameRoom gameRoom, Member member, int targetScore) {
        return new GameRoomParticipant(gameRoom, member, GameRoomParticipantRole.PLAYER, targetScore, false);
    }

    void updateReady(boolean ready) {
        this.ready = ready;
    }
}
