package com.web.study_analysis.study_business.insight.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.enrollment.entity.Enrollment;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import com.web.study_analysis.study_business.enrollment.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.insight.dto.AdminOverviewResponse;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.study_business.progress.entity.Progress;
import com.web.study_analysis.study_business.insight.dto.StudySummaryResponse;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StudyAnalyticsService {
    UserRepository userRepository;
    CourseRepository courseRepository;
    LessonRepository lessonRepository;
    EnrollmentRepository enrollmentRepository;
    ProgressRepository progressRepository;
    QuizResultRepository quizResultRepository;
    StudyLogRepository studyLogRepository;

    @Transactional(readOnly = true)
    public StudySummaryResponse summary(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOTFOUND);
        }
        int courses = enrollmentRepository.findByUser_Id(userId).size();
        long completedLessons = progressRepository.findByUser_Id(userId).stream().filter(p -> p.isCompleted()).count();

        Map<Long, QuizResult> latestByQuiz = new HashMap<>();
        for (QuizResult r : quizResultRepository.findByUser_Id(userId)) {
            Long qid = r.getQuiz().getId();
            latestByQuiz.merge(qid, r, (a, b) -> a.getSubmittedAt().isAfter(b.getSubmittedAt()) ? a : b);
        }
        Double avgQuiz = latestByQuiz.isEmpty()
                ? null
                : latestByQuiz.values().stream().mapToDouble(r -> r.getScore().doubleValue()).average().orElse(0);

        long totalMinutes = studyLogRepository.findByUser_Id(userId).stream()
                .mapToLong(l -> l.getTimeSpent() == null ? 0 : l.getTimeSpent().longValue())
                .sum();

        return StudySummaryResponse.builder()
                .enrolledCourses(courses)
                .lessonsCompleted(completedLessons)
                .averageQuizScore(avgQuiz)
                .totalStudyMinutes(totalMinutes)
                .build();
    }

    @Transactional(readOnly = true)
    public AdminOverviewResponse adminOverview() {
        List<User> users = userRepository.findAll();
        List<Course> courses = courseRepository.findAll();
        List<Enrollment> enrollments = enrollmentRepository.findAll();
        List<Lesson> lessons = lessonRepository.findAll();
        List<Progress> progresses = progressRepository.findAll();

        Map<Long, List<Long>> lessonIdsByCourseId = lessons.stream()
                .collect(Collectors.groupingBy(
                        lesson -> lesson.getCourse().getId(),
                        Collectors.mapping(Lesson::getId, Collectors.toList())
                ));
        Map<Long, Set<Long>> completedLessonIdsByUserId = progresses.stream()
                .filter(Progress::isCompleted)
                .collect(Collectors.groupingBy(
                        progress -> progress.getUser().getId(),
                        Collectors.mapping(progress -> progress.getLesson().getId(), Collectors.toCollection(HashSet::new))
                ));

        Map<Long, Long> enrollmentCountByCourseId = enrollments.stream()
                .filter(enrollment -> enrollment.getCourse() != null && enrollment.getCourse().getId() != null)
                .collect(Collectors.groupingBy(enrollment -> enrollment.getCourse().getId(), Collectors.counting()));
        Map<Long, Long> completedEnrollmentCountByCourseId = enrollments.stream()
                .filter(enrollment -> isEnrollmentCompleted(enrollment, lessonIdsByCourseId, completedLessonIdsByUserId))
                .collect(Collectors.groupingBy(enrollment -> enrollment.getCourse().getId(), Collectors.counting()));

        long completedEnrollments = completedEnrollmentCountByCourseId.values().stream()
                .mapToLong(Long::longValue)
                .sum();
        long totalEnrollments = enrollments.size();
        long pendingApprovalRequests = users.stream()
                .filter(user -> Boolean.TRUE.equals(user.getPlusUpgradeRequested()))
                .count();

        return AdminOverviewResponse.builder()
                .totalUsers(users.size())
                .totalCourses(courses.size())
                .pendingApprovalRequests(pendingApprovalRequests)
                .totalEnrollments(totalEnrollments)
                .completedEnrollments(completedEnrollments)
                .courseCompletionRatePercent(percent(completedEnrollments, totalEnrollments))
                .userGrowth(buildUserGrowth(users))
                .courseComposition(buildCourseComposition(courses))
                .topInterestedCourses(buildTopInterestedCourses(courses, lessonIdsByCourseId, enrollmentCountByCourseId, completedEnrollmentCountByCourseId))
                .topCompletedCourses(buildTopCompletedCourses(courses, lessonIdsByCourseId, enrollmentCountByCourseId, completedEnrollmentCountByCourseId))
                .build();
    }

    private List<AdminOverviewResponse.UserGrowthPoint> buildUserGrowth(List<User> users) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/yyyy");
        Map<YearMonth, Long> createdCountByMonth = users.stream()
                .filter(user -> user.getCreatedAt() != null)
                .collect(Collectors.groupingBy(user -> YearMonth.from(user.getCreatedAt()), Collectors.counting()));

        YearMonth currentMonth = YearMonth.now();
        List<AdminOverviewResponse.UserGrowthPoint> points = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            points.add(AdminOverviewResponse.UserGrowthPoint.builder()
                    .label(month.format(formatter))
                    .value(createdCountByMonth.getOrDefault(month, 0L))
                    .build());
        }
        return points;
    }

    private List<AdminOverviewResponse.CourseCategoryShare> buildCourseComposition(List<Course> courses) {
        return courses.stream()
                .collect(Collectors.groupingBy(this::getCourseCategoryLabel, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> AdminOverviewResponse.CourseCategoryShare.builder()
                        .label(entry.getKey())
                        .value(entry.getValue())
                        .build())
                .toList();
    }

    private List<AdminOverviewResponse.CourseMetricItem> buildTopInterestedCourses(
            List<Course> courses,
            Map<Long, List<Long>> lessonIdsByCourseId,
            Map<Long, Long> enrollmentCountByCourseId,
            Map<Long, Long> completedEnrollmentCountByCourseId
    ) {
        return courses.stream()
                .map(course -> toCourseMetricItem(course, lessonIdsByCourseId, enrollmentCountByCourseId, completedEnrollmentCountByCourseId))
                .filter(item -> item.getEnrollmentCount() > 0)
                .sorted((left, right) -> {
                    int cmp = Long.compare(right.getEnrollmentCount(), left.getEnrollmentCount());
                    if (cmp != 0) {
                        return cmp;
                    }
                    cmp = Double.compare(right.getCompletionRatePercent(), left.getCompletionRatePercent());
                    if (cmp != 0) {
                        return cmp;
                    }
                    return left.getCourseTitle().compareToIgnoreCase(right.getCourseTitle());
                })
                .limit(5)
                .toList();
    }

    private List<AdminOverviewResponse.CourseMetricItem> buildTopCompletedCourses(
            List<Course> courses,
            Map<Long, List<Long>> lessonIdsByCourseId,
            Map<Long, Long> enrollmentCountByCourseId,
            Map<Long, Long> completedEnrollmentCountByCourseId
    ) {
        return courses.stream()
                .map(course -> toCourseMetricItem(course, lessonIdsByCourseId, enrollmentCountByCourseId, completedEnrollmentCountByCourseId))
                .filter(item -> item.getEnrollmentCount() > 0 && item.getTotalLessons() > 0)
                .sorted((left, right) -> {
                    int cmp = Double.compare(right.getCompletionRatePercent(), left.getCompletionRatePercent());
                    if (cmp != 0) {
                        return cmp;
                    }
                    cmp = Long.compare(right.getCompletedEnrollmentCount(), left.getCompletedEnrollmentCount());
                    if (cmp != 0) {
                        return cmp;
                    }
                    cmp = Long.compare(right.getEnrollmentCount(), left.getEnrollmentCount());
                    if (cmp != 0) {
                        return cmp;
                    }
                    return left.getCourseTitle().compareToIgnoreCase(right.getCourseTitle());
                })
                .limit(5)
                .toList();
    }

    private AdminOverviewResponse.CourseMetricItem toCourseMetricItem(
            Course course,
            Map<Long, List<Long>> lessonIdsByCourseId,
            Map<Long, Long> enrollmentCountByCourseId,
            Map<Long, Long> completedEnrollmentCountByCourseId
    ) {
        long enrollmentCount = enrollmentCountByCourseId.getOrDefault(course.getId(), 0L);
        long completedEnrollmentCount = completedEnrollmentCountByCourseId.getOrDefault(course.getId(), 0L);
        int totalLessons = lessonIdsByCourseId.getOrDefault(course.getId(), List.of()).size();
        return AdminOverviewResponse.CourseMetricItem.builder()
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .category(getCourseCategoryLabel(course))
                .enrollmentCount(enrollmentCount)
                .completedEnrollmentCount(completedEnrollmentCount)
                .totalLessons(totalLessons)
                .completionRatePercent(percent(completedEnrollmentCount, enrollmentCount))
                .build();
    }

    private String getCourseCategoryLabel(Course course) {
        if (course == null || course.getCategory() == null || course.getCategory().getName() == null || course.getCategory().getName().isBlank()) {
            return "Chưa phân loại";
        }
        return course.getCategory().getName().trim();
    }

    private double percent(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0d;
        }
        return Math.round((numerator * 1000.0d) / denominator) / 10.0d;
    }

    private boolean isEnrollmentCompleted(Enrollment enrollment,
                                          Map<Long, List<Long>> lessonIdsByCourseId,
                                          Map<Long, Set<Long>> completedLessonIdsByUserId) {
        if (enrollment == null || enrollment.getCourse() == null || enrollment.getUser() == null) {
            return false;
        }
        List<Long> lessonIds = lessonIdsByCourseId.getOrDefault(enrollment.getCourse().getId(), List.of());
        if (lessonIds.isEmpty()) {
            return false;
        }
        Set<Long> completedLessonIds = completedLessonIdsByUserId.getOrDefault(enrollment.getUser().getId(), Set.of());
        return completedLessonIds.containsAll(lessonIds);
    }
}
