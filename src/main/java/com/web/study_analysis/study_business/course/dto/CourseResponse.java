package com.web.study_analysis.study_business.course.dto;

import com.web.study_analysis.study_business.course.entity.CourseStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CourseResponse {
    private Long id;
    private String title;
    private String description;
    /** ID danh mục (bảng course_category). */
    private Long categoryId;
    /** Tên danh mục (tiện hiển thị). */
    private String category;
    private String level;
    private String coverImageUrl;
    private String slug;
    private CourseStatus status;
    private LocalDateTime publishedAt;
    private String language;
    private String tags;
    private Long createdByUserId;
    private LocalDateTime createdAt;
    /** Số lesson trong khóa (đếm từ DB). */
    private long lessonCount;
    /** Tổng thời lượng ước tính (phút), cộng duration các lesson. */
    private int totalDurationMinutes;
}
