package com.my.billiards.notification.event;

import com.my.billiards.notification.dto.NotificationResponse;

public record NotificationRealtimeEvent(
	Long memberId,
	NotificationResponse notification
) {
}
