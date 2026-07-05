package com.my.billiards;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BilliardsApplication {

	public static void main(String[] args) {
		SpringApplication.run(BilliardsApplication.class, args);
	}

}
