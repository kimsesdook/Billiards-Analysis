package com.my.billiards.auth.repository;

import com.my.billiards.auth.domain.RefreshToken;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
		select token
		from RefreshToken token
		join fetch token.member
		where token.tokenHash = :tokenHash
		""")
	Optional<RefreshToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
		select token
		from RefreshToken token
		where token.familyId = :familyId
		""")
	List<RefreshToken> findAllByFamilyIdForUpdate(@Param("familyId") String familyId);
}
