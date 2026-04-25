package com.web.study_analysis.study_business.learningpath.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.enrollment.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.learningpath.dto.LessonProgressItemResponse;
import com.web.study_analysis.study_business.learningpath.dto.MyLearningCourseResponse;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.study_business.course.entity.CourseStatus;
import com.web.study_analysis.study_business.progress.entity.Progress;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.tier.SubscriptionAccess;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.web.study_analysis.study_business.quiz.entity.QuizResult;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Aggregates enrollment, lessons, progress, and quiz counts for the learner dashboard.
 * Sequential unlock: lesson N+1 opens only after lesson N is marked complete (Coursera-style path).
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LearningPathService {

    /** Khi DB chưa có ảnh bìa — URL ổn định, cho phép hotlink. */
    private static final String DEFAULT_COURSE_COVER =
            "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&auto=format&fit=crop";

    private static String effectiveCoverImageUrl(String raw) {
        if (raw == null) {
            return DEFAULT_COURSE_COVER;
        }
        String t = raw.trim();
        return t.isEmpty() ? DEFAULT_COURSE_COVER : t;
    }

    UserRepository userRepository;
    EnrollmentRepository enrollmentRepository;
    LessonRepository lessonRepository;
    QuizRepository quizRepository;
    QuizResultRepository quizResultRepository;
    ProgressRepository progressRepository;

    @Transactional(readOnly = true)
    public List<MyLearningCourseResponse> getMyCourses(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));

        Map<Long, Progress> progressByLessonId = progressRepository.findByUser_Id(userId).stream()
                .collect(Collectors.toMap(p -> p.getLesson().getId(), Function.identity(), (a, b) -> a));

        List<MyLearningCourseResponse> out = new ArrayList<>();

        for (var enrollment : enrollmentRepository.findByUser_Id(userId)) {
            Course course = enrollment.getCourse();
            if (course.getStatus() != CourseStatus.PUBLISHED) {
                // khóa bị nháp/gỡ => học viên không học tiếp được
                continue;
            }
            if (!SubscriptionAccess.canAccessContent(user, course)) {
                continue;
            }
            List<Lesson> lessonsOrdered =
                    lessonRepository.findByCourse_IdOrderByOrderIndexAsc(course.getId());

            List<LessonProgressItemResponse> items = new ArrayList<>();
            boolean previousCompleted = true;

            for (int i = 0; i < lessonsOrdered.size(); i++) {
                Lesson lesson = lessonsOrdered.get(i);
                Progress prog = progressByLessonId.get(lesson.getId());
                boolean completed = prog != null && prog.isCompleted();
                int quizzes = quizRepository.findByLesson_Id(lesson.getId()).size();

                boolean unlocked = (i == 0) || previousCompleted;

                items.add(LessonProgressItemResponse.builder()
                        .lessonId(lesson.getId())
                        .title(lesson.getTitle())
                        .kind(String.valueOf(lesson.getKind() == null ? com.web.study_analysis.study_business.lesson.entity.LessonKind.VIDEO : lesson.getKind()))
                        .contentUrl(lesson.getContentUrl())
                        .orderIndex(lesson.getOrderIndex())
                        .durationMinutes(lesson.getDuration())
                        .completed(completed)
                        .completedAt(completed && prog != null ? prog.getCompletedAt() : null)
                        .quizCount(quizzes)
                        .unlocked(unlocked)
                        .build());

                previousCompleted = completed;
            }

            // Course quiz score = sum(score) / (100 * totalQuizzes)
            List<Long> lessonIds = lessonsOrdered.stream().map(Lesson::getId).toList();
            List<Long> quizIds = lessonIds.isEmpty()
                    ? List.of()
                    : quizRepository.findByLesson_IdIn(lessonIds).stream().map(q -> q.getId()).toList();
            float sum = 0f;
            int submitted = 0;
            int totalQuizzes = quizIds.size();
            if (!quizIds.isEmpty()) {
                var results = quizResultRepository.findByUser_IdAndQuiz_IdIn(userId, quizIds);
                // Mỗi quiz chỉ tính một bài nộp (mới nhất) — dữ liệu cũ có thể có nhiều dòng cùng quiz
                Map<Long, QuizResult> latestByQuizId = new HashMap<>();
                for (var r : results) {
                    if (r == null || r.getScore() == null) {
                        continue;
                    }
                    Long qid = r.getQuiz().getId();
                    latestByQuizId.merge(
                            qid,
                            r,
                            (a, b) -> a.getSubmittedAt().isAfter(b.getSubmittedAt()) ? a : b);
                }
                submitted = latestByQuizId.size();
                for (var r : latestByQuizId.values()) {
                    sum += r.getScore();
                }
            }
            Float ratio = totalQuizzes == 0 ? null : (sum / (100f * totalQuizzes));
            if (ratio != null && ratio > 1f) {
                ratio = 1f;
            }
            Float percent = ratio == null ? null : (Math.min(100f, Math.max(0f, ratio * 100f)));

            long done = items.stream().filter(LessonProgressItemResponse::isCompleted).count();

            out.add(MyLearningCourseResponse.builder()
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .accessTier(course.getAccessTier())
                    .coverImageUrl(effectiveCoverImageUrl(course.getCoverImageUrl()))
                    .description(course.getDescription())
                    .category(course.getCategory() != null ? course.getCategory().getName() : null)
                    .level(course.getLevel())
                    .enrolledAt(enrollment.getEnrolledAt())
                    .totalLessons(items.size())
                    .completedLessons((int) done)
                    .totalQuizzes(totalQuizzes)
                    .submittedQuizzes(submitted)
                    .courseQuizScoreRatio(ratio)
                    .courseQuizScorePercent(percent)
                    .lessons(items)
                    .build());
        }

        return out;
    }
}
