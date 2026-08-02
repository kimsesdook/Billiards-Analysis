package com.my.billiards.game.repository;

import com.my.billiards.game.domain.GameRoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRoomParticipantRepository extends JpaRepository<GameRoomParticipant, Long> {
}
