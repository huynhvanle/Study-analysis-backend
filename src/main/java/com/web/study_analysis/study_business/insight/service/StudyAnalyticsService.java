package com.web.study_analysis.study_business.insight.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.enrollment.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.insight.dto.StudySummaryResponse;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StudyAnalyticsService {
    UserRepository userRepository;
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
}
