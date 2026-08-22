package com.my.billiards;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BilliardsApplicationTests {

	@Autowired
	private SpringAiRetryProperties springAiRetryProperties;

	@Autowired
	private Environment environment;

	@Test
	void contextLoadsWithAutomaticAiRetryDisabled() {
		assertThat(springAiRetryProperties.getMaxAttempts()).isEqualTo(1);
	}

	@Test
	void configuresBoundedGeminiOutputForStructuredWeeklyReport() {
		assertThat(environment.getProperty("spring.ai.google.genai.chat.max-output-tokens", Integer.class))
			.isEqualTo(1024);
		assertThat(environment.getProperty("spring.ai.google.genai.chat.thinking-budget", Integer.class))
			.isZero();
	}

}
