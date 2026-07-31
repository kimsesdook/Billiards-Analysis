package com.my.billiards.ai.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;

class GeminiWeeklyAiAnalysisGeneratorTest {

	@Test
	void rejectGenerationWhenNoAiChatModelIsConfigured() {
		@SuppressWarnings("unchecked")
		ObjectProvider<ChatModel> chatModelProvider = mock(ObjectProvider.class);
		when(chatModelProvider.getIfAvailable()).thenReturn(null);
		GeminiWeeklyAiAnalysisGenerator generator = new GeminiWeeklyAiAnalysisGenerator(chatModelProvider);

		assertThatThrownBy(() -> generator.generate(null, null))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.AI_SERVICE_UNAVAILABLE);
	}
}
