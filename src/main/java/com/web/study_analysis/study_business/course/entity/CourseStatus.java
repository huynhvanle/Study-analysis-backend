package com.web.study_analysis.study_business.course.entity;

/** Trạng thái hiển thị / ghi danh của khóa học trong catalog. */
public enum CourseStatus {
    /** Soạn thảo, chưa hiện trên catalog học viên */
    DRAFT,
    /** Đang mở ghi danh và học */
    PUBLISHED,
    /** Ngừng mở mới (vẫn có thể giữ học viên cũ tùy nghiệp vụ sau này) */
    ARCHIVED
}
