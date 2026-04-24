package com.web.study_analysis.study_business.progress.repository;

import com.web.study_analysis.study_business.progress.entity.Progress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProgressRepository extends JpaRepository<Progress, Long> {
    Optional<Progress> findByUser_IdAndLesson_Id(Long userId, Long lessonId);

    List<Progress> findByUser_Id(Long userId);

    long deleteByLesson_IdIn(Collection<Long> lessonIds);
}
