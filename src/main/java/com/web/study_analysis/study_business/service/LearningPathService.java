package com.web.study_analysis.study_business.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.dto.LessonProgressItemResponse;
import com.web.study_analysis.study_business.dto.MyLearningCourseResponse;
import com.web.study_analysis.study_business.model.Course;
import com.web.study_analysis.study_business.model.Lesson;
import com.web.study_analysis.study_business.model.Progress;
import com.web.study_analysis.study_business.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.repository.LessonRepository;
import com.web.study_analysis.study_business.repository.ProgressRepository;
import com.web.study_analysis.study_business.repository.QuizRepository;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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

    UserRepository userRepository;
    EnrollmentRepository enrollmentRepository;
    LessonRepository lessonRepository;
    QuizRepository quizRepository;
    ProgressRepository progressRepository;

    @Transactional(readOnly = true)
    public List<MyLearningCourseResponse> getMyCourses(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOTFOUND);
        }

        Map<Long, Progress> progressByLessonId = progressRepository.findByUser_Id(userId).stream()
                .collect(Collectors.toMap(p -> p.getLesson().getId(), Function.identity(), (a, b) -> a));

        List<MyLearningCourseResponse> out = new ArrayList<>();

        for (var enrollment : enrollmentRepository.findByUser_Id(userId)) {
            Course course = enrollment.getCourse();
            List<Lesson> lessonsOrdered = lessonRepository.findByCourse_IdOrderByOrderIndexAsc(course.getId());

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

            long done = items.stream().filter(LessonProgressItemResponse::isCompleted).count();

            out.add(MyLearningCourseResponse.builder()
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .description(course.getDescription())
                    .category(course.getCategory())
                    .level(course.getLevel())
                    .enrolledAt(enrollment.getEnrolledAt())
                    .totalLessons(items.size())
                    .completedLessons((int) done)
                    .lessons(items)
                    .build());
        }

        return out;
    }
}
