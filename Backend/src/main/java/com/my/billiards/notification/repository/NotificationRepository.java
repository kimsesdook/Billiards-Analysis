package com.my.billiards.notification.repository;

import com.my.billiards.notification.domain.Notification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	@Query("""
		select n
		from Notification n
		where n.member.id = :memberId
		order by n.createdAt desc
		""")
	List<Notification> findAllByMemberId(@Param("memberId") Long memberId);

	Optional<Notification> findByIdAndMember_Id(Long id, Long memberId);

	long countByMember_IdAndReadFalse(Long memberId);

	void deleteByMember_Id(Long memberId);
}
