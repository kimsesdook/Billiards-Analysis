package com.my.billiards.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthenticationFilter;
	private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;

	public SecurityConfig(
		JwtAuthenticationFilter jwtAuthenticationFilter,
		JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint
	) {
		this.jwtAuthenticationFilter = jwtAuthenticationFilter;
		this.jsonAuthenticationEntryPoint = jsonAuthenticationEntryPoint;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		return http
			.csrf(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.exceptionHandling(exception -> exception.authenticationEntryPoint(jsonAuthenticationEntryPoint))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login").permitAll()
				.requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/info").permitAll()
				.requestMatchers("/actuator/**").hasRole("ADMIN")
				.requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/contact-inquiries/me").authenticated()
				.requestMatchers(HttpMethod.GET, "/api/contact-inquiries", "/api/contact-inquiries/*").permitAll()
				.requestMatchers("/api/contact-inquiries", "/api/contact-inquiries/**").authenticated()
				.requestMatchers(HttpMethod.GET, "/api/notices", "/api/notices/*").permitAll()
				.requestMatchers("/api/admin/**").hasRole("ADMIN")
				.requestMatchers("/mcp").authenticated()
				.requestMatchers("/api/game-records/**").authenticated()
				.requestMatchers("/api/ai-reports/**").authenticated()
				.requestMatchers("/api/members/**").authenticated()
				.requestMatchers("/api/friends/**").authenticated()
				.requestMatchers("/api/notifications/**").authenticated()
				.anyRequest().permitAll()
			)
			.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
			.build();
	}

	@Bean
	public UserDetailsService userDetailsService() {
		return username -> {
			throw new UsernameNotFoundException(username);
		};
	}
}
