package com.web.study_analysis.study_business.quiz.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
        name = "quiz_result_answer",
        uniqueConstraints = @UniqueConstraint(name = "uk_quiz_result_answer_result_question", columnNames = {"quiz_result_id", "question_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizResultAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_result_id", nullable = false)
    QuizResult quizResult;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    QuizQuestion question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chosen_option_id")
    QuizOption chosenOption;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "correct_option_id")
    QuizOption correctOption;

    @Column(name = "is_correct", nullable = false)
    Boolean correct;
}
