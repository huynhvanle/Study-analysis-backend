package com.web.study_analysis.study_business.insight.controller;

import com.web.study_analysis.study_business.insight.dto.RecommendationResponse;
import com.web.study_analysis.study_business.insight.dto.StudySummaryResponse;
import com.web.study_analysis.study_business.insight.service.RecommendationService;
import com.web.study_analysis.study_business.insight.service.StudyAnalyticsService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users/{userId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StudyInsightController {
    RecommendationService recommendationService;
    StudyAnalyticsService studyAnalyticsService;

    /** Lessons to study next to lift quiz and practice scores */
    @GetMapping("/recommendations")
    public List<RecommendationResponse> recommendations(@PathVariable Long userId) {
        return recommendationService.recommendForUser(userId);
    }

    @GetMapping("/study-summary")
    public StudySummaryResponse summary(@PathVariable Long userId) {
        return studyAnalyticsService.summary(userId);
    }
}
