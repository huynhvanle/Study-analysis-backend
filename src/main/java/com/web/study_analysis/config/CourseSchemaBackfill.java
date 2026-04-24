package com.web.study_analysis.config;

import com.web.study_analysis.study_business.course.entity.CourseStatus;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sau khi thêm cột {@code status}, các bản ghi cũ có thể null — gán PUBLISHED một lần.
 */
@Component
@Order(45)
@RequiredArgsConstructor
@Slf4j
public class CourseSchemaBackfill implements ApplicationRunner {

    private final CourseRepository courseRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int n = courseRepository.updateNullStatusTo(CourseStatus.PUBLISHED);
        if (n > 0) {
            log.info("Backfilled course.status: {} row(s) set to PUBLISHED.", n);
        }
    }
}
