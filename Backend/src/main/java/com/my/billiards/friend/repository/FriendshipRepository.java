package com.my.billiards.friend.repository;

import com.my.billiards.friend.domain.Friendship;
import com.my.billiards.friend.domain.FriendshipStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

	@Query("""
		select f
		from Friendship f
		join fetch f.requester
		join fetch f.receiver
		where f.status = :status
		  and (f.requester.id = :memberId or f.receiver.id = :memberId)
		order by f.updatedAt desc
		""")
	List<Friendship> findByMemberIdAndStatus(
		@Param("memberId") Long memberId,
		@Param("status") FriendshipStatus status
	);

	@Query("""
		select f
		from Friendship f
		join fetch f.requester
		join fetch f.receiver
		where f.receiver.id = :memberId
		  and f.status = :status
		order by f.createdAt desc
		""")
	List<Friendship> findReceivedByMemberIdAndStatus(
		@Param("memberId") Long memberId,
		@Param("status") FriendshipStatus status
	);

	@Query("""
		select f
		from Friendship f
		join fetch f.requester
		join fetch f.receiver
		where f.requester.id = :memberId
		  and f.status = :status
		order by f.createdAt desc
		""")
	List<Friendship> findSentByMemberIdAndStatus(
		@Param("memberId") Long memberId,
		@Param("status") FriendshipStatus status
	);

	@Query("""
		select f
		from Friendship f
		join fetch f.requester
		join fetch f.receiver
		where f.requester.id = :memberId
		   or f.receiver.id = :memberId
		""")
	List<Friendship> findAllByMemberId(@Param("memberId") Long memberId);

	@Query("""
		select f
		from Friendship f
		join fetch f.requester
		join fetch f.receiver
		where f.memberLowId = :memberLowId
		  and f.memberHighId = :memberHighId
		""")
	Optional<Friendship> findByMemberPair(
		@Param("memberLowId") Long memberLowId,
		@Param("memberHighId") Long memberHighId
	);
}
