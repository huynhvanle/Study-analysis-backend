package com.web.study_analysis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class StudyAnalysisApplication {

	public static void main(String[] args) {
		SpringApplication.run(StudyAnalysisApplication.class, args);
	}

}

