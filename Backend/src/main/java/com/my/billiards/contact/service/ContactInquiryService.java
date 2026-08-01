package com.my.billiards.contact.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.common.api.PageResponse;
import com.my.billiards.contact.domain.ContactInquiry;
import com.my.billiards.contact.domain.InquiryStatus;
import com.my.billiards.contact.dto.ContactInquiryAnswerRequest;
import com.my.billiards.contact.dto.ContactInquiryCreateRequest;
import com.my.billiards.contact.dto.ContactInquiryResponse;
import com.my.billiards.contact.dto.ContactInquirySummaryResponse;
import com.my.billiards.contact.event.ContactInquiryAnsweredEvent;
import com.my.billiards.contact.repository.ContactInquiryRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactInquiryService {

	private final ContactInquiryRepository contactInquiryRepository;
	private final MemberRepository memberRepository;
	private final ApplicationEventPublisher eventPublisher;

	@Transactional
	public ContactInquiryResponse create(Long memberId, ContactInquiryCreateRequest request) {
		Member member = getActiveMember(memberId);
		ContactInquiry inquiry = ContactInquiry.create(
			member,
			request.title().trim(),
			request.content().trim(),
			request.isPrivate()
		);

		return ContactInquiryResponse.from(contactInquiryRepository.save(inquiry));
	}

	@Transactional(readOnly = true)
	public List<ContactInquirySummaryResponse> findPublic() {
		return contactInquiryRepository.findAllByPrivateInquiryFalseOrderByCreatedAtDescIdDesc()
			.stream()
			.map(ContactInquirySummaryResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public List<ContactInquirySummaryResponse> findMine(Long memberId) {
		return contactInquiryRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(memberId)
			.stream()
			.map(ContactInquirySummaryResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public PageResponse<ContactInquirySummaryResponse> findAllForAdmin(
		Long administratorId,
		InquiryStatus status,
		int page,
		int size
	) {
		getActiveAdministrator(administratorId);
		Page<ContactInquiry> inquiries = status == null
			? contactInquiryRepository.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page, size))
			: contactInquiryRepository.findAllByStatusOrderByCreatedAtDescIdDesc(status, PageRequest.of(page, size));

		return PageResponse.from(inquiries, ContactInquirySummaryResponse::from);
	}

	@Transactional(readOnly = true)
	public ContactInquiryResponse findById(Long inquiryId, Long viewerId, MemberRole viewerRole) {
		ContactInquiry inquiry = contactInquiryRepository.findById(inquiryId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND));

		if (!inquiry.canBeReadBy(viewerId, viewerRole)) {
			throw new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND);
		}

		return ContactInquiryResponse.from(inquiry);
	}

	@Transactional
	public ContactInquiryResponse answer(Long inquiryId, Long administratorId, ContactInquiryAnswerRequest request) {
		Member administrator = getActiveAdministrator(administratorId);

		ContactInquiry inquiry = contactInquiryRepository.findById(inquiryId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND));

		boolean wasPending = inquiry.getStatus() == InquiryStatus.PENDING;
		inquiry.answer(administrator, request.answerContent().trim());
		if (wasPending) {
			eventPublisher.publishEvent(new ContactInquiryAnsweredEvent(inquiry.getId(), inquiry.getMember().getId()));
		}

		return ContactInquiryResponse.from(inquiry);
	}

	private Member getActiveMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.UNAUTHORIZED));

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}

	private Member getActiveAdministrator(Long memberId) {
		Member member = getActiveMember(memberId);
		if (member.getRole() != MemberRole.ADMIN) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}
}
