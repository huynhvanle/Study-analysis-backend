package com.web.study_analysis.study_business.lesson.repository;

import com.web.study_analysis.study_business.lesson.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findByCourse_IdOrderByOrderIndexAsc(Long courseId);

    long countByCourse_Id(Long courseId);

    @Query("SELECT COALESCE(SUM(l.duration), 0) FROM Lesson l WHERE l.course.id = :courseId")
    Long sumDurationMinutesByCourseId(@Param("courseId") Long courseId);
}
