package com.my.billiards.notice.repository;

import com.my.billiards.notice.domain.Notice;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

	Page<Notice> findAllByDeletedAtIsNullOrderByImportantDescPublishedAtDescIdDesc(Pageable pageable);

	Optional<Notice> findByIdAndDeletedAtIsNull(Long id);
}
