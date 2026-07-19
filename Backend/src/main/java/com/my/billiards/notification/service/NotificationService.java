package com.my.billiards.notification.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.member.domain.Member;
import com.my.billiards.notification.domain.Notification;
import com.my.billiards.notification.domain.NotificationType;
import com.my.billiards.notification.dto.NotificationResponse;
import com.my.billiards.notification.repository.NotificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

	private final NotificationRepository notificationRepository;

	@Transactional
	public NotificationResponse createForMember(
		Member member,
		NotificationType type,
		String title,
		String message,
		String relatedResourceType,
		Long relatedResourceId
	) {
		Notification notification = Notification.create(
			member,
			type,
			title,
			message,
			relatedResourceType,
			relatedResourceId
		);

		return NotificationResponse.from(notificationRepository.save(notification));
	}

	@Transactional(readOnly = true)
	public List<NotificationResponse> findAll(Long memberId) {
		return notificationRepository.findAllByMemberId(memberId)
			.stream()
			.map(NotificationResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public long countUnread(Long memberId) {
		return notificationRepository.countByMember_IdAndReadFalse(memberId);
	}

	@Transactional
	public NotificationResponse markAsRead(Long memberId, Long notificationId) {
		Notification notification = getOwnedNotification(memberId, notificationId);
		notification.markAsRead();
		return NotificationResponse.from(notification);
	}

	@Transactional
	public void markAllAsRead(Long memberId) {
		notificationRepository.findAllByMemberId(memberId)
			.forEach(Notification::markAsRead);
	}

	@Transactional
	public void delete(Long memberId, Long notificationId) {
		notificationRepository.delete(getOwnedNotification(memberId, notificationId));
	}

	@Transactional
	public void deleteAll(Long memberId) {
		notificationRepository.deleteByMember_Id(memberId);
	}

	private Notification getOwnedNotification(Long memberId, Long notificationId) {
		return notificationRepository.findByIdAndMember_Id(notificationId, memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "알림을 찾을 수 없습니다."));
	}
}
