package com.my.billiards.notification.event;

import com.my.billiards.contact.event.ContactInquiryAnsweredEvent;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notification.domain.NotificationType;
import com.my.billiards.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ContactInquiryAnswerNotificationListener {

	private final MemberRepository memberRepository;
	private final NotificationService notificationService;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handle(ContactInquiryAnsweredEvent event) {
		memberRepository.findById(event.memberId())
			.filter(member -> member.getStatus() == MemberStatus.ACTIVE)
			.ifPresent(member -> notificationService.createForMember(
				member,
				NotificationType.SYSTEM,
				"문의 답변 등록",
				"작성하신 문의에 관리자 답변이 등록되었습니다.",
				"CONTACT_INQUIRY",
				event.inquiryId()
			));
	}
}
