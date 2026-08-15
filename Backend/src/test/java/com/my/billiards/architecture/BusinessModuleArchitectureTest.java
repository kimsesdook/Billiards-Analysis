package com.my.billiards.architecture;

import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
	packages = {
		"com.my.billiards.ai",
		"com.my.billiards.auth",
		"com.my.billiards.contact",
		"com.my.billiards.friend",
		"com.my.billiards.game",
		"com.my.billiards.invitation",
		"com.my.billiards.member",
		"com.my.billiards.notice",
		"com.my.billiards.notification"
	},
	importOptions = ImportOption.DoNotIncludeTests.class
)
class BusinessModuleArchitectureTest {

	@ArchTest
	static final ArchRule business_modules_must_be_free_of_cycles = slices()
		.matching("com.my.billiards.(*)..")
		.should().beFreeOfCycles()
		.because("business modules must remain independently understandable and changeable");
}
