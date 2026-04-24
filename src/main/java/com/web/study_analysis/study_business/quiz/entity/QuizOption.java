package com.web.study_analysis.study_business.quiz.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "quiz_option")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    QuizQuestion question;

    @Column(nullable = false, length = 5)
    String code; // A/B/C/D

    @Column(nullable = false, length = 1000)
    String content;

    @Column(name = "is_correct", nullable = false)
    Boolean correct;
}

