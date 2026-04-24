package com.web.study_analysis.config;

import com.web.study_analysis.study_business.course.entity.CourseCategory;
import com.web.study_analysis.study_business.course.repository.CourseCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Danh mục mặc định (có thể thêm/sửa/xoá qua API /course-categories). Chạy một lần khi bảng trống.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(11)
public class DefaultCourseCategoriesBootstrap implements ApplicationRunner {

    private final CourseCategoryRepository courseCategoryRepository;

    private static final String[] NAMES = {
            "Arts and Humanities",
            "Business",
            "Computer Science",
            "Data Science",
            "Health",
            "Information Technology",
            "Language Learning",
            "Math and Logic",
            "Physical Science and Engineering",
            "Social Sciences",
            "Personal Development",
    };

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (courseCategoryRepository.count() > 0) {
            return;
        }
        for (String name : NAMES) {
            courseCategoryRepository.save(CourseCategory.builder().name(name).build());
        }
        log.info("Seeded {} default course categories.", NAMES.length);
    }
}
