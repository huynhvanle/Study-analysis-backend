package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.CourseRequest;
import com.web.study_analysis.study_business.dto.CourseResponse;
import com.web.study_analysis.study_business.service.CourseService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseController {
    CourseService courseService;

    @PostMapping
    public CourseResponse create(@Valid @RequestBody CourseRequest request) {
        return courseService.create(request);
    }

    @GetMapping
    public List<CourseResponse> list(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank()) {
            return courseService.listByCategory(category);
        }
        return courseService.listAll();
    }

    @GetMapping("/{courseId}")
    public CourseResponse get(@PathVariable Long courseId) {
        return courseService.getById(courseId);
    }
}
