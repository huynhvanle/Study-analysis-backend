package com.web.study_analysis.study_business.studylog.repository;

import com.web.study_analysis.study_business.studylog.entity.StudyLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface StudyLogRepository extends JpaRepository<StudyLog, Long> {
    List<StudyLog> findByUser_Id(Long userId);

    List<StudyLog> findByUser_IdAndLesson_Id(Long userId, Long lessonId);

    long deleteByLesson_IdIn(Collection<Long> lessonIds);
}
