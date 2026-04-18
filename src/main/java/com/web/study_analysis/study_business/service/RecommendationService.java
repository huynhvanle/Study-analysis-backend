package com.web.study_analysis.study_business.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.dto.RecommendationResponse;
import com.web.study_analysis.study_business.model.Lesson;
import com.web.study_analysis.study_business.model.Progress;
import com.web.study_analysis.study_business.model.Quiz;
import com.web.study_analysis.study_business.model.QuizResult;
import com.web.study_analysis.study_business.repository.*;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Suggests lessons to review next so quiz and practice scores go up:
 * incomplete lessons, missing quiz attempts, low latest quiz scores, weak study_log practice.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RecommendationService {
    static final float WEAK_QUIZ_THRESHOLD = 72f;
    static final float WEAK_PRACTICE_THRESHOLD = 65f;

    UserRepository userRepository;
    EnrollmentRepository enrollmentRepository;
    LessonRepository lessonRepository;
    QuizRepository quizRepository;
    QuizResultRepository quizResultRepository;
    ProgressRepository progressRepository;
    StudyLogRepository studyLogRepository;

    @Transactional(readOnly = true)
    public List<RecommendationResponse> recommendForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOTFOUND);
        }

        Map<Long, QuizResult> latestByQuizId = quizResultRepository.findByUser_Id(userId).stream()
                .collect(Collectors.toMap(
                        r -> r.getQuiz().getId(),
                        r -> r,
                        (a, b) -> a.getSubmittedAt().isAfter(b.getSubmittedAt()) ? a : b));

        List<RecommendationResponse> out = new ArrayList<>();

        for (var enrollment : enrollmentRepository.findByUser_Id(userId)) {
            var course = enrollment.getCourse();
            List<Lesson> lessons = lessonRepository.findByCourse_IdOrderByOrderIndexAsc(course.getId());

            for (Lesson lesson : lessons) {
                Optional<Progress> prog = progressRepository.findByUser_IdAndLesson_Id(userId, lesson.getId());
                boolean completed = prog.map(Progress::isCompleted).orElse(false);

                List<Quiz> quizzes = quizRepository.findByLesson_Id(lesson.getId());
                StudyLogAggregate logAgg = aggregateLogs(
                        studyLogRepository.findByUser_IdAndLesson_Id(userId, lesson.getId())
                );
                double priority = 0;
                List<String> reasons = new ArrayList<>();

                if (!completed) {
                    priority += 50;
                    reasons.add("Not marked complete yet");
                }

                if (quizzes.isEmpty()) {
                    if (priority > 0) {
                        out.add(build(lesson, course.getTitle(), priority, String.join("; ", reasons)));
                    }
                    continue;
                }

                for (Quiz q : quizzes) {
                    QuizResult latest = latestByQuizId.get(q.getId());
                    if (latest == null) {
                        priority += 28;
                        reasons.add("Quiz not attempted: " + q.getTitle());
                    } else if (latest.getScore() < WEAK_QUIZ_THRESHOLD) {
                        double gap = WEAK_QUIZ_THRESHOLD - latest.getScore();
                        priority += gap * 1.5;
                        reasons.add("Review quiz \"" + q.getTitle() + "\" (score " + latest.getScore().intValue() + ")");
                    }
                }

                if (logAgg.avgScore != null && logAgg.avgScore < WEAK_PRACTICE_THRESHOLD) {
                    priority += 18;
                    reasons.add("Practice scores from study sessions are low");
                }
                if (logAgg.maxAttempt >= 3) {
                    priority += 8;
                    reasons.add("Several study attempts — consolidate the material");
                }

                if (priority > 0) {
                    out.add(build(lesson, course.getTitle(), priority,
                            reasons.isEmpty() ? "Focus this lesson" : String.join("; ", reasons)));
                }
            }
        }

        out.sort(Comparator.comparingDouble(RecommendationResponse::getPriorityScore).reversed()
                .thenComparingInt(RecommendationResponse::getOrderIndex));

        return out.stream().limit(25).toList();
    }

    private static StudyLogAggregate aggregateLogs(List<com.web.study_analysis.study_business.model.StudyLog> logs) {
        if (logs.isEmpty()) {
            return new StudyLogAggregate(0, null);
        }
        int maxAttempt = logs.stream().mapToInt(l -> l.getAttempt()).max().orElse(0);
        OptionalDouble avg = logs.stream()
                .filter(l -> l.getScore() != null)
                .mapToDouble(l -> l.getScore().doubleValue())
                .average();
        return new StudyLogAggregate(maxAttempt, avg.isPresent() ? avg.getAsDouble() : null);
    }

    private static RecommendationResponse build(Lesson lesson, String courseTitle, double priority, String reason) {
        return RecommendationResponse.builder()
                .lessonId(lesson.getId())
                .courseId(lesson.getCourse().getId())
                .courseTitle(courseTitle)
                .lessonTitle(lesson.getTitle())
                .orderIndex(lesson.getOrderIndex())
                .priorityScore(Math.round(priority * 10.0) / 10.0)
                .reason(reason)
                .build();
    }

    private record StudyLogAggregate(int maxAttempt, Double avgScore) {}
}
