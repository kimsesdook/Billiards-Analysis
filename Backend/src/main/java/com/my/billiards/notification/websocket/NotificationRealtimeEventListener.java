package com.my.billiards.notification.websocket;

import com.my.billiards.notification.event.NotificationRealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class NotificationRealtimeEventListener {

	private final NotificationRealtimeSender realtimeSender;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
	public void handle(NotificationRealtimeEvent event) {
		realtimeSender.sendCreated(event.memberId(), event.notification());
	}
}
