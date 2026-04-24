package com.web.study_analysis.study_business.course.entity;

import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "course")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, length = 255)
    String title;

    @Column(length = 1000)
    String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    CourseCategory category;

    @Column(length = 50)
    String level;

    /** Ảnh bìa (URL tuyệt đối hoặc path tĩnh). */
    @Column(name = "cover_image_url", length = 2000)
    String coverImageUrl;

    /** Đường dẫn thân thiện, duy nhất (VD: spring-boot-rest-thuc-chien). */
    @Column(length = 160, unique = true)
    String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    CourseStatus status = CourseStatus.PUBLISHED;

    @Column(name = "published_at")
    LocalDateTime publishedAt;

    /** Mã ngôn ngữ nội dung (vd: vi, en). */
    @Column(length = 20)
    String language;

    /** Thẻ phân loại, phân tách bằng dấu phẩy. */
    @Column(length = 500)
    String tags;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    User createdBy;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Lesson> lessons = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        touchPublishedAtIfNeeded();
    }

    @PreUpdate
    void preUpdate() {
        touchPublishedAtIfNeeded();
    }

    void touchPublishedAtIfNeeded() {
        if (status == CourseStatus.PUBLISHED && publishedAt == null) {
            publishedAt = LocalDateTime.now();
        }
    }
}
