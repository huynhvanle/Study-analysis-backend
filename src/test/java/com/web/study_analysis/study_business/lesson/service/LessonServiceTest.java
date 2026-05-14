package com.web.study_analysis.study_business.lesson.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.course.service.CourseService;
import com.web.study_analysis.study_business.lesson.dto.LessonRequest;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.entity.LessonKind;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LessonServiceTest {

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private CourseService courseService;

    @Mock
    private ProgressRepository progressRepository;

    @Mock
    private StudyLogRepository studyLogRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizResultRepository quizResultRepository;

    @InjectMocks
    private LessonService lessonService;

    @Test
    void update_quizLessonWithResults_rejectsEdit() {
        Long courseId = 41L;
        Long lessonId = 410L;
        Long quizId = 411L;
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(quizLesson(courseId, lessonId)));
        when(quizRepository.findByLesson_Id(lessonId)).thenReturn(List.of(
                Quiz.builder().id(quizId).title("Quiz").build()
        ));
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> lessonService.update(courseId, lessonId, lessonRequest()));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void delete_quizLessonWithResults_rejectsDelete() {
        Long courseId = 42L;
        Long lessonId = 420L;
        Long quizId = 421L;
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(quizLesson(courseId, lessonId)));
        when(quizRepository.findByLesson_Id(lessonId)).thenReturn(List.of(
                Quiz.builder().id(quizId).title("Quiz").build()
        ));
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> lessonService.delete(courseId, lessonId));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(lessonRepository, never()).deleteById(lessonId);
        verify(quizResultRepository, never()).deleteByQuiz_IdIn(List.of(quizId));
    }

    private Lesson quizLesson(Long courseId, Long lessonId) {
        return Lesson.builder()
                .id(lessonId)
                .course(Course.builder().id(courseId).title("Course").build())
                .title("Lesson quiz")
                .kind(LessonKind.QUIZ)
                .contentUrl("about:blank")
                .duration(15)
                .orderIndex(1)
                .build();
    }

    private LessonRequest lessonRequest() {
        LessonRequest request = new LessonRequest();
        request.setTitle("Lesson mới");
        request.setContentUrl("about:blank");
        request.setDuration(10);
        request.setOrderIndex(1);
        return request;
    }
}
