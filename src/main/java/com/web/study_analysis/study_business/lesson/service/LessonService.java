package com.web.study_analysis.study_business.lesson.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.service.CourseService;
import com.web.study_analysis.study_business.lesson.dto.LessonRequest;
import com.web.study_analysis.study_business.lesson.dto.LessonResponse;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.entity.LessonKind;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonService {
    LessonRepository lessonRepository;
    CourseService courseService;
    ProgressRepository progressRepository;
    StudyLogRepository studyLogRepository;
    QuizRepository quizRepository;
    QuizResultRepository quizResultRepository;

    @Transactional
    public LessonResponse create(Long courseId, LessonRequest request) {
        var course = courseService.getEntityById(courseId);
        LessonKind kind = parseKind(request.getKind());

        String contentUrl = request.getContentUrl();
        if (kind == LessonKind.QUIZ) {
            // Backward-compatible: many existing DB schemas still have content_url NOT NULL.
            // We store a harmless placeholder and hide it in UI for quiz lessons.
            contentUrl = "about:blank";
        } else {
            if (contentUrl == null || contentUrl.isBlank()) {
                throw new AppException(ErrorCode.UNCATEGORIZE);
            }
        }
        Lesson lesson = Lesson.builder()
                .course(course)
                .title(request.getTitle())
                .kind(kind)
                .contentUrl(contentUrl)
                .duration(request.getDuration())
                .orderIndex(request.getOrderIndex())
                .build();
        Lesson saved = lessonRepository.save(lesson);
        if (kind == LessonKind.QUIZ) {
            // 1 quiz per lesson; title matches lesson title
            Quiz quiz = Quiz.builder().lesson(saved).title(saved.getTitle()).build();
            quizRepository.save(quiz);
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> listByCourse(Long courseId) {
        courseService.getEntityById(courseId);
        return lessonRepository.findByCourse_IdOrderByOrderIndexAsc(courseId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonResponse getById(Long lessonId) {
        return toResponse(lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND)));
    }

    @Transactional(readOnly = true)
    public LessonResponse getByCourseAndLesson(Long courseId, Long lessonId) {
        Lesson l = lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (!l.getCourse().getId().equals(courseId)) {
            throw new AppException(ErrorCode.LESSON_NOT_FOUND);
        }
        return toResponse(l);
    }

    @Transactional
    public LessonResponse update(Long courseId, Long lessonId, LessonRequest request) {
        Lesson l = lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (!l.getCourse().getId().equals(courseId)) {
            throw new AppException(ErrorCode.LESSON_NOT_FOUND);
        }
        LessonKind kind = l.getKind() == null ? LessonKind.VIDEO : l.getKind();
        l.setTitle(request.getTitle());
        if (kind == LessonKind.QUIZ) {
            l.setContentUrl("about:blank");
            // keep quiz title in sync
            var quizzes = quizRepository.findByLesson_Id(lessonId);
            if (!quizzes.isEmpty()) {
                quizzes.forEach(q -> q.setTitle(l.getTitle()));
                quizRepository.saveAll(quizzes);
            }
        } else {
            l.setContentUrl(request.getContentUrl());
        }
        l.setDuration(request.getDuration());
        l.setOrderIndex(request.getOrderIndex());
        return toResponse(lessonRepository.save(l));
    }

    @Transactional
    public void delete(Long courseId, Long lessonId) {
        Lesson l = lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (!l.getCourse().getId().equals(courseId)) {
            throw new AppException(ErrorCode.LESSON_NOT_FOUND);
        }
        var quizIds = quizRepository.findByLesson_Id(lessonId).stream().map(q -> q.getId()).toList();
        if (!quizIds.isEmpty()) {
            quizResultRepository.deleteByQuiz_IdIn(quizIds);
        }
        progressRepository.deleteByLesson_IdIn(List.of(lessonId));
        studyLogRepository.deleteByLesson_IdIn(List.of(lessonId));
        lessonRepository.deleteById(lessonId);
    }

    public Lesson getEntityById(Long lessonId) {
        return lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
    }

    private LessonResponse toResponse(Lesson l) {
        Long quizId = null;
        if (l.getKind() == LessonKind.QUIZ) {
            var qs = quizRepository.findByLesson_Id(l.getId());
            if (!qs.isEmpty()) {
                quizId = qs.get(0).getId();
            }
        }
        return LessonResponse.builder()
                .id(l.getId())
                .courseId(l.getCourse().getId())
                .title(l.getTitle())
                .kind(String.valueOf(l.getKind() == null ? LessonKind.VIDEO : l.getKind()))
                .contentUrl(l.getContentUrl())
                .duration(l.getDuration())
                .orderIndex(l.getOrderIndex())
                .quizId(quizId)
                .build();
    }

    private LessonKind parseKind(String raw) {
        if (raw == null || raw.isBlank()) return LessonKind.VIDEO;
        try {
            return LessonKind.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            return LessonKind.VIDEO;
        }
    }
}
