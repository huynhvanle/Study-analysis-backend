package com.web.study_analysis.study_business.quiz.repository;

import com.web.study_analysis.study_business.quiz.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByQuiz_IdOrderByOrderIndexAscIdAsc(Long quizId);
}

