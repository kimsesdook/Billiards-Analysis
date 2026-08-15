package com.my.billiards.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import jakarta.persistence.Entity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.repository.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

@AnalyzeClasses(
	packages = "com.my.billiards",
	importOptions = ImportOption.DoNotIncludeTests.class
)
class LayerArchitectureTest {

	@ArchTest
	static final ArchRule controllers_must_not_access_repositories_directly = noClasses()
		.that().resideInAPackage("..controller..")
		.should().dependOnClassesThat().resideInAPackage("..repository..")
		.because("controllers must delegate business and persistence work to services");

	@ArchTest
	static final ArchRule services_must_not_depend_on_controllers = noClasses()
		.that().areAnnotatedWith(Service.class)
		.should().dependOnClassesThat().resideInAPackage("..controller..")
		.because("the service layer must stay independent from HTTP delivery code");

	@ArchTest
	static final ArchRule domain_must_not_depend_on_outer_layers = noClasses()
		.that().resideInAPackage("..domain..")
		.should().dependOnClassesThat().resideInAnyPackage(
			"..controller..",
			"..service..",
			"..repository..",
			"..dto..",
			"..websocket.."
		)
		.because("domain objects must not depend on delivery or infrastructure layers");

	@ArchTest
	static final ArchRule rest_controllers_must_follow_controller_conventions = classes()
		.that().resideInAPackage("..controller..")
		.should().haveSimpleNameEndingWith("Controller")
		.andShould().beAnnotatedWith(RestController.class)
		.because("REST endpoints must be easy to locate and review");

	@ArchTest
	static final ArchRule jpa_entities_must_reside_in_domain_packages = classes()
		.that().areAnnotatedWith(Entity.class)
		.should().resideInAPackage("..domain..")
		.because("persistence entities are part of each module's domain model");

	@ArchTest
	static final ArchRule spring_data_repositories_must_follow_repository_conventions = classes()
		.that().areAssignableTo(Repository.class)
		.should().resideInAPackage("..repository..")
		.andShould().haveSimpleNameEndingWith("Repository")
		.because("persistence boundaries must be explicit and consistently named");

	@ArchTest
	static final ArchRule spring_services_must_follow_service_naming = classes()
		.that().areAnnotatedWith(Service.class)
		.should().haveSimpleNameEndingWith("Service")
		.because("Spring services must expose their architectural role in their name");

	@ArchTest
	static final ArchRule field_injection_must_not_be_used = noFields()
		.should().beAnnotatedWith(Autowired.class)
		.because("constructor injection keeps dependencies explicit and testable");
}
