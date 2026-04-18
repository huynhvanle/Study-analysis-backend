package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.MyLearningCourseResponse;
import com.web.study_analysis.study_business.service.LearningPathService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Learner-facing aggregation: enrolled courses with ordered lessons, progress, quiz counts,
 * and sequential unlock flags (aligned with enrollment / lesson / progress in the ERD).
 */
@RestController
@RequestMapping("/learning")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LearningController {

    LearningPathService learningPathService;

    /** All courses the user enrolled in, with lesson path and completion state. */
    @GetMapping("/users/{userId}/my-courses")
    public List<MyLearningCourseResponse> myCourses(@PathVariable Long userId) {
        return learningPathService.getMyCourses(userId);
    }
}
