package com.my.billiards.game.repository;

import com.my.billiards.game.domain.GameRoom;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRoomRepository extends JpaRepository<GameRoom, Long> {

    boolean existsByJoinCode(String joinCode);

    @Query("""
        select distinct gameRoom
        from GameRoom gameRoom
        join fetch gameRoom.host
        left join fetch gameRoom.participants participant
        left join fetch participant.member
        where gameRoom.id = :roomId
        """)
    Optional<GameRoom> findDetailById(@Param("roomId") Long roomId);

    @Query("""
        select distinct gameRoom
        from GameRoom gameRoom
        join fetch gameRoom.host
        join gameRoom.participants currentParticipant
        left join fetch gameRoom.participants participant
        left join fetch participant.member
        where currentParticipant.member.id = :memberId
        order by gameRoom.updatedAt desc, gameRoom.id desc
        """)
    List<GameRoom> findAllByParticipantMemberId(@Param("memberId") Long memberId);
}
