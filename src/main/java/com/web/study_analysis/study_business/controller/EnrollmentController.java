package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.EnrollmentRequest;
import com.web.study_analysis.study_business.dto.EnrollmentResponse;
import com.web.study_analysis.study_business.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EnrollmentController {
    EnrollmentService enrollmentService;

    @PostMapping
    public EnrollmentResponse enroll(@Valid @RequestBody EnrollmentRequest request) {
        return enrollmentService.enroll(request);
    }

    @GetMapping("/user/{userId}")
    public List<EnrollmentResponse> listForUser(@PathVariable Long userId) {
        return enrollmentService.listForUser(userId);
    }
}
