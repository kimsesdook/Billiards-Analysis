package com.my.billiards.game.websocket;

import com.my.billiards.game.event.GameRoomRealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class GameRoomRealtimeEventListener {

    private final GameRoomRealtimeSender realtimeSender;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handle(GameRoomRealtimeEvent event) {
        realtimeSender.send(event);
    }
}
