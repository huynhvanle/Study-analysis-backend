package com.web.study_analysis.study_business.course.repository;

import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.course.entity.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByCategory_IdAndStatus(Long categoryId, CourseStatus status);

    long countByCategory_Id(Long categoryId);

    List<Course> findByStatusOrderByCreatedAtDesc(CourseStatus status);

    boolean existsBySlug(String slug);

    Optional<Course> findBySlug(String slug);

    @Query(
            "SELECT c FROM Course c WHERE c.status = :status AND ("
                    + "LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%'))"
                    + " OR LOWER(COALESCE(c.description, '')) LIKE LOWER(CONCAT('%', :q, '%'))"
                    + " OR LOWER(COALESCE(c.category.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))"
                    + " OR LOWER(COALESCE(c.tags, '')) LIKE LOWER(CONCAT('%', :q, '%'))"
                    + " OR LOWER(COALESCE(c.slug, '')) LIKE LOWER(CONCAT('%', :q, '%'))"
                    + ")")
    List<Course> searchByKeywordAndStatus(@Param("q") String q, @Param("status") CourseStatus status);

    @Modifying
    @Query("UPDATE Course c SET c.status = :status WHERE c.status IS NULL")
    int updateNullStatusTo(@Param("status") CourseStatus status);
}
