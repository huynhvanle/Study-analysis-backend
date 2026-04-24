package com.web.study_analysis.study_business.lesson.entity;

import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lesson")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Lesson {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    Course course;

    @Column(nullable = false, length = 255)
    String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    LessonKind kind = LessonKind.VIDEO;

    @Column(name = "content_url", length = 2000)
    String contentUrl;

    @Column(nullable = false)
    Integer duration;

    @Column(name = "order_index", nullable = false)
    Integer orderIndex;

    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<Quiz> quizzes = new ArrayList<>();
}
