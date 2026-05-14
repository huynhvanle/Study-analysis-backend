package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.quiz.dto.QuizRequest;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.repository.QuizOptionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizResultRepository quizResultRepository;

    @Mock
    private LessonService lessonService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuizQuestionRepository quizQuestionRepository;

    @Mock
    private QuizOptionRepository quizOptionRepository;

    @InjectMocks
    private QuizService quizService;

    @Test
    void update_whenQuizHasResults_rejectsEdit() {
        Long quizId = 21L;
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(
                Quiz.builder().id(quizId).title("Quiz cũ").build()
        ));
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        QuizRequest request = new QuizRequest();
        request.setTitle("Quiz mới");

        AppException exception = assertThrows(AppException.class, () -> quizService.update(quizId, request));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(quizRepository, never()).save(any());
    }

    @Test
    void delete_whenQuizHasResults_rejectsDelete() {
        Long quizId = 22L;
        when(quizRepository.existsById(quizId)).thenReturn(true);
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        AppException exception = assertThrows(AppException.class, () -> quizService.delete(quizId));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(quizRepository, never()).deleteById(quizId);
    }
}
