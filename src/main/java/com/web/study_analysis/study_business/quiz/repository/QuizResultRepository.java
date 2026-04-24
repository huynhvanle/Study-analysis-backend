package com.web.study_analysis.study_business.quiz.repository;

import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface QuizResultRepository extends JpaRepository<QuizResult, Long> {
    List<QuizResult> findByUser_Id(Long userId);

    long deleteByQuiz_IdIn(Collection<Long> quizIds);
}
