package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.LessonRequest;
import com.web.study_analysis.study_business.dto.LessonResponse;
import com.web.study_analysis.study_business.service.LessonService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/courses/{courseId}/lessons")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonController {
    LessonService lessonService;

    @PostMapping
    public LessonResponse create(@PathVariable Long courseId, @Valid @RequestBody LessonRequest request) {
        return lessonService.create(courseId, request);
    }

    @GetMapping
    public List<LessonResponse> list(@PathVariable Long courseId) {
        return lessonService.listByCourse(courseId);
    }

    @GetMapping("/{lessonId}")
    public LessonResponse get(@PathVariable Long courseId, @PathVariable Long lessonId) {
        return lessonService.getByCourseAndLesson(courseId, lessonId);
    }
}
