package com.my.billiards.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;
import com.my.billiards.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;

class LocalAdminBootstrapRunnerTest {

	private final MemberRepository memberRepository = mock(MemberRepository.class);
	private final BilliardsProperties properties = new BilliardsProperties();
	private final ApplicationArguments arguments = mock(ApplicationArguments.class);
	private LocalAdminBootstrapRunner runner;

	@BeforeEach
	void setUp() {
		properties.getAdminBootstrap().setEmail("admin@example.com");
		runner = new LocalAdminBootstrapRunner(memberRepository, properties);
	}

	@Test
	void grantsAdministratorRoleToTheConfiguredActiveMember() throws Exception {
		Member member = Member.create("admin@example.com", "password-hash", "Admin");
		when(memberRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(member));

		runner.run(arguments);

		assertThat(member.getRole()).isEqualTo(MemberRole.ADMIN);
		verify(memberRepository).save(member);
	}

	@Test
	void rejectsAnEnabledBootstrapWithoutAnEmail() {
		properties.getAdminBootstrap().setEmail("   ");

		assertThatThrownBy(() -> runner.run(arguments))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("ADMIN_BOOTSTRAP_EMAIL");

		verifyNoInteractions(memberRepository);
	}

	@Test
	void rejectsAnEmailThatDoesNotBelongToAnExistingMember() {
		when(memberRepository.findByEmail("admin@example.com")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> runner.run(arguments))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("not found");
	}

	@Test
	void leavesAnExistingAdministratorUnchanged() throws Exception {
		Member member = Member.create("admin@example.com", "password-hash", "Admin");
		member.grantAdministratorRole();
		when(memberRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(member));

		runner.run(arguments);

		verify(memberRepository, never()).save(member);
	}
}
