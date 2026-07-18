package com.my.billiards.member.repository;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {

	boolean existsByEmail(String email);

	Optional<Member> findByEmail(String email);

	@Query("""
		select m
		from Member m
		where m.id <> :memberId
		  and m.status = :status
		  and (
			lower(m.displayName) like lower(concat('%', :keyword, '%'))
			or lower(m.nickname) like lower(concat('%', :keyword, '%'))
			or lower(m.email) like lower(concat('%', :keyword, '%'))
		  )
		order by m.nickname asc
		""")
	List<Member> searchActiveMembers(
		@Param("memberId") Long memberId,
		@Param("status") MemberStatus status,
		@Param("keyword") String keyword,
		Pageable pageable
	);
}
