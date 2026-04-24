package com.web.study_analysis.study_business.quiz.repository;

import com.web.study_analysis.study_business.quiz.entity.QuizOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizOptionRepository extends JpaRepository<QuizOption, Long> {
    List<QuizOption> findByQuestion_IdOrderByCodeAscIdAsc(Long questionId);
    long countByQuestion_IdAndCorrectTrue(Long questionId);
}

