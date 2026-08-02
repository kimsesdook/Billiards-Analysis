package com.my.billiards.notice.service;

import com.my.billiards.common.api.PageResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notice.domain.Notice;
import com.my.billiards.notice.dto.NoticeCreateRequest;
import com.my.billiards.notice.dto.NoticeResponse;
import com.my.billiards.notice.dto.NoticeSummaryResponse;
import com.my.billiards.notice.dto.NoticeUpdateRequest;
import com.my.billiards.notice.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NoticeService {

	private final NoticeRepository noticeRepository;
	private final MemberRepository memberRepository;

	@Transactional(readOnly = true)
	public PageResponse<NoticeSummaryResponse> findAll(int page, int size) {
		Page<Notice> notices = noticeRepository.findAllByOrderByImportantDescPublishedAtDescIdDesc(
			PageRequest.of(page, size)
		);

		return PageResponse.from(notices, NoticeSummaryResponse::from);
	}

	@Transactional(readOnly = true)
	public NoticeResponse findById(Long noticeId) {
		return NoticeResponse.from(getNotice(noticeId));
	}

	@Transactional
	public NoticeResponse create(Long administratorId, NoticeCreateRequest request) {
		Member administrator = getActiveAdministrator(administratorId);
		Notice notice = Notice.create(
			administrator,
			request.title().trim(),
			request.content().trim(),
			request.category(),
			request.isImportant()
		);

		return NoticeResponse.from(noticeRepository.save(notice));
	}

	@Transactional
	public NoticeResponse update(Long noticeId, Long administratorId, NoticeUpdateRequest request) {
		getActiveAdministrator(administratorId);
		Notice notice = getNotice(noticeId);
		notice.update(
			request.title().trim(),
			request.content().trim(),
			request.category(),
			request.isImportant()
		);

		return NoticeResponse.from(notice);
	}

	private Notice getNotice(Long noticeId) {
		return noticeRepository.findById(noticeId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND));
	}

	private Member getActiveAdministrator(Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.UNAUTHORIZED));

		if (member.getStatus() != MemberStatus.ACTIVE || member.getRole() != MemberRole.ADMIN) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}
}
