package com.my.billiards;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BilliardsApplicationTests {

	@Autowired
	private SpringAiRetryProperties springAiRetryProperties;

	@Test
	void contextLoadsWithAutomaticAiRetryDisabled() {
		assertThat(springAiRetryProperties.getMaxAttempts()).isEqualTo(1);
	}

}
