package com.web.study_analysis.study_business.course.controller;

import com.web.study_analysis.study_business.course.dto.CourseRequest;
import com.web.study_analysis.study_business.course.dto.CourseResponse;
import com.web.study_analysis.study_business.course.dto.CourseUpdateRequest;
import com.web.study_analysis.study_business.course.service.CourseService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
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

    /** Quản trị: mọi trạng thái (bao gồm nháp). */
    @GetMapping("/management")
    public List<CourseResponse> listManagement() {
        return courseService.listAllForManagement();
    }

    /** Chi tiết khóa (mọi trạng thái) — dùng form sửa admin. */
    @GetMapping("/management/{courseId}")
    public CourseResponse getManagement(@PathVariable Long courseId) {
        return courseService.getByIdForManagement(courseId);
    }

    /** Xóa khóa và dữ liệu phụ thuộc (ghi danh, tiến độ, quiz result, …). */
    @DeleteMapping("/management/{courseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteManagement(@PathVariable Long courseId) {
        courseService.deleteForManagement(courseId);
    }

    /** Catalog công khai — chỉ khóa PUBLISHED. Lọc theo danh mục: {@code ?categoryId=1}. */
    @GetMapping
    public List<CourseResponse> list(@RequestParam(required = false) Long categoryId) {
        if (categoryId != null) {
            return courseService.listPublishedByCategoryId(categoryId);
        }
        return courseService.listPublishedCatalog();
    }

    /** GET /courses/search?q=... — phải khai báo trước /{courseId} */
    @GetMapping("/search")
    public List<CourseResponse> search(@RequestParam(name = "q", required = false) String q) {
        return courseService.searchPublished(q);
    }

    /** Chi tiết theo slug (URL thân thiện). */
    @GetMapping("/by-slug/{slug}")
    public CourseResponse getBySlug(@PathVariable String slug) {
        return courseService.getPublishedBySlug(slug);
    }

    @GetMapping("/{courseId}")
    public CourseResponse get(@PathVariable Long courseId) {
        return courseService.getPublishedById(courseId);
    }

    @PutMapping("/{courseId}")
    public CourseResponse update(@PathVariable Long courseId, @RequestBody CourseUpdateRequest request) {
        return courseService.update(courseId, request);
    }
}
