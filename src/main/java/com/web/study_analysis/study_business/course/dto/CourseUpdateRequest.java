package com.web.study_analysis.study_business.course.dto;

import com.web.study_analysis.study_business.course.entity.CourseStatus;
import lombok.Data;

/** Cập nhật từng phần — chỉ trường khác null mới được áp dụng. */
@Data
public class CourseUpdateRequest {
    private String title;
    private String description;
    /** Đổi danh mục — ID trong /course-categories. */
    private Long categoryId;
    private String level;
    private String coverImageUrl;
    private String slug;
    private CourseStatus status;
    private String language;
    private String tags;
}
