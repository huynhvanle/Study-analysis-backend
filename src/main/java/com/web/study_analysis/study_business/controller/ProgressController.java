package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.ProgressRequest;
import com.web.study_analysis.study_business.dto.ProgressResponse;
import com.web.study_analysis.study_business.service.ProgressService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/progress")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProgressController {
    ProgressService progressService;

    @PutMapping
    public ProgressResponse upsert(@Valid @RequestBody ProgressRequest request) {
        return progressService.upsert(request);
    }

    @GetMapping("/user/{userId}")
    public List<ProgressResponse> listForUser(@PathVariable Long userId) {
        return progressService.listForUser(userId);
    }
}
