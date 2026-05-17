package com.web.study_analysis.study_business.insight.controller;

import com.web.study_analysis.study_business.insight.dto.AdminOverviewResponse;
import com.web.study_analysis.study_business.insight.service.StudyAnalyticsService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/insights")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminInsightController {
    StudyAnalyticsService studyAnalyticsService;

    @GetMapping("/overview")
    public AdminOverviewResponse overview() {
        return studyAnalyticsService.adminOverview();
    }
}
