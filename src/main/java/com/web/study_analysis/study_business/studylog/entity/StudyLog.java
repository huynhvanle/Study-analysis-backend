package com.web.study_analysis.study_business.studylog.entity;

import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StudyLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    Lesson lesson;

    @Column(name = "time_spent", nullable = false)
    Integer timeSpent;

    Float score;

    @Column(nullable = false)
    Integer attempt;

    @Column(name = "studied_at", nullable = false)
    LocalDateTime studiedAt;

    @PrePersist
    void prePersist() {
        if (studiedAt == null) {
            studiedAt = LocalDateTime.now();
        }
    }
}
