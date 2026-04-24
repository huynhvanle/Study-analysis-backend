package com.web.study_analysis.study_business.course.controller;

import com.web.study_analysis.study_business.course.dto.CourseCategoryRequest;
import com.web.study_analysis.study_business.course.dto.CourseCategoryResponse;
import com.web.study_analysis.study_business.course.service.CourseCategoryService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/course-categories")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseCategoryController {

    CourseCategoryService courseCategoryService;

    @GetMapping
    public List<CourseCategoryResponse> list() {
        return courseCategoryService.listAll();
    }

    @PostMapping
    public CourseCategoryResponse create(@Valid @RequestBody CourseCategoryRequest request) {
        return courseCategoryService.create(request);
    }

    @PutMapping("/{id}")
    public CourseCategoryResponse update(@PathVariable Long id, @Valid @RequestBody CourseCategoryRequest request) {
        return courseCategoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        courseCategoryService.delete(id);
    }
}
