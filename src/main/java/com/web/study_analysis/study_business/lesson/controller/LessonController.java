package com.web.study_analysis.study_business.lesson.controller;

import com.web.study_analysis.study_business.lesson.dto.LessonRequest;
import com.web.study_analysis.study_business.lesson.dto.LessonResponse;
import com.web.study_analysis.study_business.lesson.service.LessonService;
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

    @PutMapping("/{lessonId}")
    public LessonResponse update(@PathVariable Long courseId, @PathVariable Long lessonId, @Valid @RequestBody LessonRequest request) {
        return lessonService.update(courseId, lessonId, request);
    }

    @DeleteMapping("/{lessonId}")
    public void delete(@PathVariable Long courseId, @PathVariable Long lessonId) {
        lessonService.delete(courseId, lessonId);
    }
}
