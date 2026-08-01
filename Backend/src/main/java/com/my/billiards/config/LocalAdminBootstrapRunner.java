package com.my.billiards.config;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("local")
@ConditionalOnProperty(prefix = "app.admin-bootstrap", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class LocalAdminBootstrapRunner implements ApplicationRunner {

	private final MemberRepository memberRepository;
	private final BilliardsProperties properties;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		String email = normalizeEmail(properties.getAdminBootstrap().getEmail());
		if (email.isBlank()) {
			throw new IllegalStateException("ADMIN_BOOTSTRAP_EMAIL is required when local admin bootstrap is enabled.");
		}

		Member member = memberRepository.findByEmail(email)
			.orElseThrow(() -> new IllegalStateException("The configured local admin account was not found."));

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new IllegalStateException("The configured local admin account must be active.");
		}

		if (member.getRole() == MemberRole.ADMIN) {
			log.info("Local administrator bootstrap confirmed an existing administrator.");
			return;
		}

		member.grantAdministratorRole();
		memberRepository.save(member);
		log.info("Local administrator bootstrap granted the administrator role.");
	}

	private String normalizeEmail(String email) {
		return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
	}
}
