package com.web.study_analysis.study_business.repository;

import com.web.study_analysis.study_business.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findByLesson_Id(Long lessonId);
}
