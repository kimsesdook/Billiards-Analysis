package com.my.billiards.contact.repository;

import com.my.billiards.contact.domain.ContactInquiry;
import com.my.billiards.contact.domain.InquiryStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactInquiryRepository extends JpaRepository<ContactInquiry, Long> {

	List<ContactInquiry> findAllByPrivateInquiryFalseOrderByCreatedAtDescIdDesc();

	List<ContactInquiry> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId);

	Page<ContactInquiry> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

	Page<ContactInquiry> findAllByStatusOrderByCreatedAtDescIdDesc(InquiryStatus status, Pageable pageable);
}
