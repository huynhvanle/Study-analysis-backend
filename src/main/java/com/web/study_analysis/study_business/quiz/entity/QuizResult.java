package com.web.study_analysis.study_business.quiz.entity;

import com.web.study_analysis.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "quiz_result",
        uniqueConstraints = @UniqueConstraint(name = "uk_quiz_result_user_quiz", columnNames = {"user_id", "quiz_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    Quiz quiz;

    @Column(nullable = false)
    Float score;

    @Column(name = "submitted_at", nullable = false)
    LocalDateTime submittedAt;

    @OneToMany(mappedBy = "quizResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<QuizResultAnswer> answers = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }
}
