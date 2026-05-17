package com.web.study_analysis.study_business.insight.service;

import com.web.study_analysis.study_business.course.entity.CourseCategory;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import com.web.study_analysis.study_business.enrollment.entity.Enrollment;
import com.web.study_analysis.study_business.enrollment.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.insight.dto.AdminOverviewResponse;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.study_business.progress.entity.Progress;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudyAnalyticsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private ProgressRepository progressRepository;

    @Mock
    private QuizResultRepository quizResultRepository;

    @Mock
    private StudyLogRepository studyLogRepository;

    @InjectMocks
    private StudyAnalyticsService studyAnalyticsService;

    @Test
    void adminOverview_buildsCardsChartsAndTopCourseData() {
        LocalDateTime now = LocalDateTime.now();

        User user1 = User.builder()
                .id(1L)
                .username("student1")
                .password("x")
                .role("STUDENT")
                .email("student1@example.com")
                .createdAt(now.minusMonths(1))
                .plusUpgradeRequested(true)
                .build();
        User user2 = User.builder()
                .id(2L)
                .username("student2")
                .password("x")
                .role("STUDENT")
                .email("student2@example.com")
                .createdAt(now)
                .plusUpgradeRequested(false)
                .build();
        User user3 = User.builder()
                .id(3L)
                .username("student3")
                .password("x")
                .role("STUDENT")
                .email("student3@example.com")
                .createdAt(now)
                .plusUpgradeRequested(true)
                .build();

        CourseCategory it = CourseCategory.builder().id(91L).name("IT").build();
        CourseCategory marketing = CourseCategory.builder().id(92L).name("Marketing").build();

        Course course1 = Course.builder().id(11L).title("Java Core").category(it).createdBy(user1).build();
        Course course2 = Course.builder().id(12L).title("Spring Boot").category(it).createdBy(user1).build();
        Course course3 = Course.builder().id(13L).title("Digital Ads").category(marketing).createdBy(user1).build();
        Lesson lesson11 = Lesson.builder().id(101L).course(course1).title("Bài 1").duration(10).orderIndex(1).build();
        Lesson lesson12 = Lesson.builder().id(102L).course(course1).title("Bài 2").duration(15).orderIndex(2).build();
        Lesson lesson21 = Lesson.builder().id(201L).course(course2).title("Bài 1").duration(12).orderIndex(1).build();
        Lesson lesson31 = Lesson.builder().id(301L).course(course3).title("Bài 1").duration(8).orderIndex(1).build();

        when(userRepository.findAll()).thenReturn(List.of(user1, user2, user3));
        when(courseRepository.findAll()).thenReturn(List.of(course1, course2, course3));
        when(enrollmentRepository.findAll()).thenReturn(List.of(
                Enrollment.builder().id(1L).user(user1).course(course1).build(),
                Enrollment.builder().id(2L).user(user2).course(course1).build(),
                Enrollment.builder().id(3L).user(user2).course(course2).build(),
                Enrollment.builder().id(4L).user(user3).course(course3).build()
        ));
        when(lessonRepository.findAll()).thenReturn(List.of(lesson11, lesson12, lesson21, lesson31));
        when(progressRepository.findAll()).thenReturn(List.of(
                Progress.builder().id(1L).user(user1).lesson(lesson11).completed(true).build(),
                Progress.builder().id(2L).user(user1).lesson(lesson12).completed(true).build(),
                Progress.builder().id(3L).user(user2).lesson(lesson11).completed(true).build(),
                Progress.builder().id(4L).user(user2).lesson(lesson12).completed(false).build(),
                Progress.builder().id(5L).user(user2).lesson(lesson21).completed(false).build(),
                Progress.builder().id(6L).user(user3).lesson(lesson31).completed(true).build()
        ));

        AdminOverviewResponse response = studyAnalyticsService.adminOverview();

        assertEquals(3L, response.getTotalUsers());
        assertEquals(3L, response.getTotalCourses());
        assertEquals(2L, response.getPendingApprovalRequests());
        assertEquals(4L, response.getTotalEnrollments());
        assertEquals(2L, response.getCompletedEnrollments());
        assertEquals(50.0d, response.getCourseCompletionRatePercent());
        assertEquals(6, response.getUserGrowth().size());
        assertEquals("IT", response.getCourseComposition().get(0).getLabel());
        assertEquals(2L, response.getCourseComposition().get(0).getValue());
        assertEquals("Java Core", response.getTopInterestedCourses().get(0).getCourseTitle());
        assertEquals(2L, response.getTopInterestedCourses().get(0).getEnrollmentCount());
        assertEquals("Java Core", response.getTopCompletedCourses().get(0).getCourseTitle());
        assertEquals(100.0d, response.getTopCompletedCourses().get(0).getCompletionRatePercent());
    }
}
