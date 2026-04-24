package com.web.study_analysis.config;

import com.web.study_analysis.study_business.course.entity.CourseCategory;
import com.web.study_analysis.study_business.course.repository.CourseCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gán {@code category_id} từ cột varchar {@code category} cũ (nếu còn) sau khi đổi schema sang FK.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(40)
public class CourseLegacyCategoryMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final CourseCategoryRepository courseCategoryRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!legacyCategoryColumnExists()) {
            return;
        }
        List<String> distinct;
        try {
            distinct = jdbcTemplate.query(
                    "SELECT DISTINCT TRIM(category) AS cat FROM course WHERE category IS NOT NULL AND TRIM(category) <> ''",
                    (rs, rowNum) -> rs.getString("cat"));
        } catch (Exception e) {
            log.debug("Skip legacy category migration: {}", e.getMessage());
            return;
        }
        for (String raw : distinct) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String name = raw.trim();
            if (!courseCategoryRepository.existsByNameIgnoreCase(name)) {
                courseCategoryRepository.save(CourseCategory.builder().name(name).build());
            }
        }
        try {
            int n = jdbcTemplate.update(
                    "UPDATE course c INNER JOIN course_category cc ON LOWER(TRIM(c.category)) = LOWER(cc.name) "
                            + "SET c.category_id = cc.id WHERE c.category_id IS NULL AND c.category IS NOT NULL");
            if (n > 0) {
                log.info("Linked {} course row(s) from legacy category column to course_category.", n);
            }
        } catch (Exception e) {
            log.warn("Could not run legacy category SQL migration: {}", e.getMessage());
        }
    }

    private boolean legacyCategoryColumnExists() {
        try {
            Integer c = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() "
                            + "AND TABLE_NAME = 'course' AND COLUMN_NAME = 'category'",
                    Integer.class);
            return c != null && c > 0;
        } catch (Exception e) {
            return false;
        }
    }
}
