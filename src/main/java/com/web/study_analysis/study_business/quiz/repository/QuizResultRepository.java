package com.web.study_analysis.study_business.quiz.repository;

import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface QuizResultRepository extends JpaRepository<QuizResult, Long> {
    List<QuizResult> findByUser_Id(Long userId);

    boolean existsByUser_IdAndQuiz_Id(Long userId, Long quizId);

    long countByUser_IdAndQuiz_Id(Long userId, Long quizId);

    java.util.Optional<QuizResult> findTopByUser_IdAndQuiz_IdOrderBySubmittedAtDescIdDesc(Long userId, Long quizId);

    List<QuizResult> findByUser_IdAndQuiz_IdIn(Long userId, Collection<Long> quizIds);

    long deleteByQuiz_IdIn(Collection<Long> quizIds);
}
