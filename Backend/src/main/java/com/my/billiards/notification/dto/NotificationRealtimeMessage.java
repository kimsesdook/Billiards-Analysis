package com.my.billiards.notification.dto;

public record NotificationRealtimeMessage(
	String eventType,
	NotificationResponse notification
) {

	private static final String NOTIFICATION_CREATED = "NOTIFICATION_CREATED";

	public static NotificationRealtimeMessage created(NotificationResponse notification) {
		return new NotificationRealtimeMessage(NOTIFICATION_CREATED, notification);
	}
}
