package com.my.billiards.common.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.my.billiards.common.logging.RequestIdFilter;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.filter.OncePerRequestFilter;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TracingIntegrationTest.TraceCaptureConfiguration.class)
class TracingIntegrationTest {

	private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
	private static final String PARENT_SPAN_ID = "0123456789abcdef";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AtomicReference<CapturedTrace> capturedTrace;

	@Autowired
	private Environment environment;

	@BeforeEach
	void clearCapturedTrace() {
		capturedTrace.set(null);
	}

	@Test
	void continuesW3cTraceContextAndCorrelatesMdcValues() throws Exception {
		mockMvc.perform(get("/actuator/health/liveness")
				.header("traceparent", "00-" + TRACE_ID + "-" + PARENT_SPAN_ID + "-01")
				.header(RequestIdFilter.HEADER_NAME, "trace-test-request"))
			.andExpect(status().isOk())
			.andExpect(header().string(RequestIdFilter.HEADER_NAME, "trace-test-request"));

		CapturedTrace trace = capturedTrace.get();
		assertThat(trace).isNotNull();
		assertThat(trace.traceId()).isEqualTo(TRACE_ID);
		assertThat(trace.spanId()).matches("[0-9a-f]{16}").isNotEqualTo(PARENT_SPAN_ID);
		assertThat(trace.mdcTraceId()).isEqualTo(trace.traceId());
		assertThat(trace.mdcSpanId()).isEqualTo(trace.spanId());
	}

	@Test
	void keepsOtlpExportDisabledByDefault() {
		assertThat(environment.getProperty("management.tracing.export.otlp.enabled", Boolean.class)).isFalse();
		assertThat(environment.getProperty("management.otlp.metrics.export.enabled", Boolean.class)).isFalse();
		assertThat(environment.getProperty("management.logging.export.otlp.enabled", Boolean.class)).isFalse();
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class TraceCaptureConfiguration {

		@Bean
		AtomicReference<CapturedTrace> capturedTrace() {
			return new AtomicReference<>();
		}

		@Bean
		FilterRegistrationBean<OncePerRequestFilter> traceCaptureFilter(
			Tracer tracer,
			AtomicReference<CapturedTrace> capturedTrace
		) {
			OncePerRequestFilter filter = new OncePerRequestFilter() {
				@Override
				protected void doFilterInternal(
					HttpServletRequest request,
					HttpServletResponse response,
					FilterChain filterChain
				) throws ServletException, IOException {
					Span span = tracer.currentSpan();
					if (span != null) {
						capturedTrace.set(new CapturedTrace(
							span.context().traceId(),
							span.context().spanId(),
							MDC.get("traceId"),
							MDC.get("spanId")
						));
					}
					filterChain.doFilter(request, response);
				}
			};
			FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
			registration.setOrder(Ordered.LOWEST_PRECEDENCE);
			return registration;
		}
	}

	private record CapturedTrace(
		String traceId,
		String spanId,
		String mdcTraceId,
		String mdcSpanId
	) {
	}
}
