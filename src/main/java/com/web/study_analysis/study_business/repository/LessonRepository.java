package com.web.study_analysis.study_business.repository;

import com.web.study_analysis.study_business.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findByCourse_IdOrderByOrderIndexAsc(Long courseId);
}
