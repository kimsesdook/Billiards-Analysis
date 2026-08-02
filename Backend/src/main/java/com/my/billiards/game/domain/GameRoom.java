package com.my.billiards.game.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.member.domain.Member;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Getter
@Entity
@Table(name = "game_rooms")
public class GameRoom extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_member_id", nullable = false)
    private Member host;

    @Column(name = "room_name", nullable = false, length = 50)
    private String name;

    @Column(name = "join_code", nullable = false, unique = true, length = 12)
    private String joinCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_mode", nullable = false, length = 30)
    private GameMode gameMode;

    @Column(name = "player_capacity", nullable = false)
    private int playerCapacity;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_status", nullable = false, length = 30)
    private GameRoomStatus status;

    @OneToMany(mappedBy = "gameRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt asc, id asc")
    private List<GameRoomParticipant> participants = new ArrayList<>();

    protected GameRoom() {
    }

    private GameRoom(
        Member host,
        String name,
        String joinCode,
        GameType gameType,
        GameMode gameMode,
        int playerCapacity,
        int hostTargetScore
    ) {
        this.host = host;
        this.name = name;
        this.joinCode = joinCode;
        this.gameType = gameType;
        this.gameMode = gameMode;
        this.playerCapacity = playerCapacity;
        this.status = GameRoomStatus.WAITING;
        this.participants.add(GameRoomParticipant.host(this, host, hostTargetScore));
    }

    public static GameRoom create(
        Member host,
        String name,
        String joinCode,
        GameType gameType,
        GameMode gameMode,
        int playerCapacity,
        int hostTargetScore
    ) {
        return new GameRoom(host, name, joinCode, gameType, gameMode, playerCapacity, hostTargetScore);
    }

    public boolean isHost(Long memberId) {
        return host.getId().equals(memberId);
    }

    public boolean hasParticipant(Long memberId) {
        return participants.stream().anyMatch(participant -> participant.getMember().getId().equals(memberId));
    }

    public boolean isWaiting() {
        return status == GameRoomStatus.WAITING;
    }

    public boolean hasVacancy() {
        return participants.size() < playerCapacity;
    }

    public void addPlayer(Member member, int targetScore) {
        this.participants.add(GameRoomParticipant.player(this, member, targetScore));
    }

    public void cancel() {
        this.status = GameRoomStatus.CANCELED;
    }
}
