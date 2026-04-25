package com.web.study_analysis.study_business.course.dto;

import com.web.study_analysis.study_business.course.entity.CourseStatus;
import com.web.study_analysis.study_business.tier.SubscriptionTier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CourseRequest {
    @NotBlank
    private String title;
    private String description;
    /** ID bản ghi trong bảng danh mục (GET /course-categories). */
    @NotNull
    private Long categoryId;
    private String level;
    /** Ảnh bìa (URL). */
    private String coverImageUrl;
    /** Slug tùy chỉnh; để trống sẽ tạo từ tiêu đề. */
    private String slug;
    /** Mặc định PUBLISHED nếu không gửi. */
    private CourseStatus status;
    private String language;
    /** Thẻ, phân tách bằng dấu phẩy. */
    private String tags;
    /** Mặc định FREE nếu không gửi. */
    private SubscriptionTier accessTier;
    @NotNull
    private Long createdByUserId;
}
