package com.web.study_analysis.config;

import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.course.entity.CourseCategory;
import com.web.study_analysis.study_business.course.repository.CourseCategoryRepository;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Khóa học + bài học mẫu khi catalog trống (dev/demo). Chạy sau khi đã có ít nhất một user (vd. admin).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(52)
public class DemoCourseBootstrap implements ApplicationRunner {

    private final CourseRepository courseRepository;
    private final CourseCategoryRepository courseCategoryRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (courseRepository.count() > 0) {
            return;
        }
        User creator =
                userRepository.findByUsername("admin").orElseGet(() -> userRepository.findAll().stream()
                        .findFirst()
                        .orElse(null));
        if (creator == null) {
            log.warn("Skip demo courses: no user in database.");
            return;
        }

        CourseCategory catCs = courseCategoryRepository
                .findByNameIgnoreCase("Computer Science")
                .orElseThrow(() -> new IllegalStateException("Expected 'Computer Science' category (seed missing)."));
        CourseCategory catDs = courseCategoryRepository
                .findByNameIgnoreCase("Data Science")
                .orElseThrow(() -> new IllegalStateException("Expected 'Data Science' category (seed missing)."));

        Course c1 = courseRepository.save(
                Course.builder()
                        .title("Spring Boot & REST API thực chiến")
                        .description(
                                "Làm quen Spring Boot 3, REST, validation và tích hợp JPA. Phù hợp người đã biết Java cơ bản.")
                        .category(catCs)
                        .level("Beginner")
                        .coverImageUrl("https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80")
                        .slug("spring-boot-rest-api-thuc-chien")
                        .language("vi")
                        .tags("Java, Spring Boot, REST, Backend")
                        .createdBy(creator)
                        .build());

        lessonRepository.save(Lesson.builder()
                .course(c1)
                .title("Giới thiệu Spring Boot")
                .contentUrl("https://spring.io/projects/spring-boot")
                .duration(25)
                .orderIndex(1)
                .build());
        lessonRepository.save(Lesson.builder()
                .course(c1)
                .title("Xây dựng REST controller")
                .contentUrl("https://spring.io/guides/gs/rest-service/")
                .duration(40)
                .orderIndex(2)
                .build());

        Course c2 = courseRepository.save(
                Course.builder()
                        .title("Phân tích dữ liệu cho người mới")
                        .description("Tư duy dữ liệu, biểu đồ và bước đầu với SQL / Python.")
                        .category(catDs)
                        .level("Beginner")
                        .coverImageUrl("https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80")
                        .slug("phan-tich-du-lieu-cho-nguoi-moi")
                        .language("vi")
                        .tags("Data, SQL, Python, Analytics")
                        .createdBy(creator)
                        .build());

        lessonRepository.save(Lesson.builder()
                .course(c2)
                .title("Dữ liệu là gì?")
                .contentUrl("https://en.wikipedia.org/wiki/Data_analysis")
                .duration(20)
                .orderIndex(1)
                .build());

        log.info("Seeded {} demo courses with sample lessons.", courseRepository.count());
    }
}
