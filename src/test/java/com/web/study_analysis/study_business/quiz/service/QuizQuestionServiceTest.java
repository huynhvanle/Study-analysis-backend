package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionRequest;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.entity.QuizQuestion;
import com.web.study_analysis.study_business.quiz.repository.QuizOptionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
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
class QuizQuestionServiceTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizQuestionRepository questionRepository;

    @Mock
    private QuizOptionRepository optionRepository;

    @Mock
    private QuizResultRepository quizResultRepository;

    @InjectMocks
    private QuizQuestionService quizQuestionService;

    @Test
    void create_whenQuizHasResults_rejectsNewQuestion() {
        Long quizId = 31L;
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(
                Quiz.builder().id(quizId).title("Quiz đã khóa").build()
        ));
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> quizQuestionService.create(quizId, validRequest()));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void update_whenQuizHasResults_rejectsEdit() {
        Long quizId = 32L;
        Long questionId = 320L;
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(
                QuizQuestion.builder()
                        .id(questionId)
                        .quiz(Quiz.builder().id(quizId).title("Quiz đã khóa").build())
                        .prompt("Câu hỏi")
                        .orderIndex(1)
                        .build()
        ));
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> quizQuestionService.update(questionId, validRequest()));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(questionRepository, never()).save(any());
    }

    @Test
    void delete_whenQuizHasResults_rejectsDelete() {
        Long quizId = 33L;
        Long questionId = 330L;
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(
                QuizQuestion.builder()
                        .id(questionId)
                        .quiz(Quiz.builder().id(quizId).title("Quiz đã khóa").build())
                        .prompt("Câu hỏi")
                        .orderIndex(1)
                        .build()
        ));
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> quizQuestionService.delete(questionId));

        assertEquals(ErrorCode.QUIZ_RESULTS_LOCKED, exception.getErrorCode());
        verify(questionRepository, never()).deleteById(questionId);
    }

    private QuizQuestionRequest validRequest() {
        QuizQuestionRequest request = new QuizQuestionRequest();
        request.setPrompt("Java là gì?");
        request.setOrderIndex(1);
        request.setOptionA("Ngôn ngữ");
        request.setOptionB("Hệ điều hành");
        request.setOptionC("Trình duyệt");
        request.setOptionD("CSDL");
        request.setCorrectCode("A");
        return request;
    }
}
