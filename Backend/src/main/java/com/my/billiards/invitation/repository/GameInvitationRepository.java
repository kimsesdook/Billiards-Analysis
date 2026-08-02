package com.my.billiards.invitation.repository;

import com.my.billiards.invitation.domain.GameInvitation;
import com.my.billiards.invitation.domain.GameInvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameInvitationRepository extends JpaRepository<GameInvitation, Long> {

	@Query("""
		select invitation
		from GameInvitation invitation
		join fetch invitation.requester
		join fetch invitation.receiver
		left join fetch invitation.gameRoom
		where invitation.status = :status
		  and (invitation.requester.id = :memberId or invitation.receiver.id = :memberId)
		order by invitation.createdAt desc
		""")
	List<GameInvitation> findByMemberIdAndStatus(
		@Param("memberId") Long memberId,
		@Param("status") GameInvitationStatus status
	);

	List<GameInvitation> findByRequester_IdAndReceiver_IdAndStatus(
		Long requesterId,
		Long receiverId,
		GameInvitationStatus status
	);

	@Query("""
		select invitation
		from GameInvitation invitation
		join fetch invitation.requester
		join fetch invitation.receiver
		left join fetch invitation.gameRoom
		where invitation.id = :invitationId
		""")
	Optional<GameInvitation> findDetailById(@Param("invitationId") Long invitationId);
}
