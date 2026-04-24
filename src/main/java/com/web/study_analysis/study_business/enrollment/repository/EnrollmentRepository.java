package com.web.study_analysis.study_business.enrollment.repository;

import com.web.study_analysis.study_business.enrollment.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByUser_Id(Long userId);

    boolean existsByUser_IdAndCourse_Id(Long userId, Long courseId);

    Optional<Enrollment> findByUser_IdAndCourse_Id(Long userId, Long courseId);

    long deleteByCourse_Id(Long courseId);
}
