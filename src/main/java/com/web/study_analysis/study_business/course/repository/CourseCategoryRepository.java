package com.web.study_analysis.study_business.course.repository;

import com.web.study_analysis.study_business.course.entity.CourseCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourseCategoryRepository extends JpaRepository<CourseCategory, Long> {

    List<CourseCategory> findAllByOrderByIdAsc();

    Optional<CourseCategory> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
