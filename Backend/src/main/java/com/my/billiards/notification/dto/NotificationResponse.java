package com.my.billiards.notification.dto;

import com.my.billiards.notification.domain.Notification;
import com.my.billiards.notification.domain.NotificationType;
import java.time.LocalDateTime;

public record NotificationResponse(
	Long id,
	NotificationType type,
	String title,
	String message,
	boolean read,
	String relatedResourceType,
	Long relatedResourceId,
	LocalDateTime createdAt
) {

	public static NotificationResponse from(Notification notification) {
		return new NotificationResponse(
			notification.getId(),
			notification.getType(),
			notification.getTitle(),
			notification.getMessage(),
			notification.isRead(),
			notification.getRelatedResourceType(),
			notification.getRelatedResourceId(),
			notification.getCreatedAt()
		);
	}
}
