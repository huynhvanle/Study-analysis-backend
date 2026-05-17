package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitResponse;
import com.web.study_analysis.study_business.quiz.entity.QuizOption;
import com.web.study_analysis.study_business.quiz.entity.QuizQuestion;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import com.web.study_analysis.study_business.quiz.entity.QuizResultAnswer;
import com.web.study_analysis.study_business.quiz.repository.QuizOptionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultAnswerRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.tier.SubscriptionTier;
import com.web.study_analysis.user.entity.User;
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

    @Mock
    private QuizResultAnswerRepository quizResultAnswerRepository;

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

    @Test
    void getReview_freeUser_rejectsDetailedReview() {
        Long userId = 40L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder()
                        .id(userId)
                        .username("free-user")
                        .password("encoded")
                        .role("STUDENT")
                        .email("free@example.com")
                        .plan(SubscriptionTier.FREE)
                        .build()
        ));

        AppException exception = assertThrows(AppException.class, () -> quizService.getReview(userId, 5L));

        assertEquals(ErrorCode.PLUS_QUIZ_REVIEW_REQUIRED, exception.getErrorCode());
    }

    @Test
    void submitAnswers_freeUser_returnsScoreOnly() {
        Long userId = 41L;
        Long quizId = 410L;
        Long questionId = 411L;
        QuizOption optionA = QuizOption.builder().id(1L).code("A").content("Đúng").correct(true).build();
        QuizOption optionB = QuizOption.builder().id(2L).code("B").content("Sai").correct(false).build();
        QuizQuestion question = QuizQuestion.builder()
                .id(questionId)
                .prompt("Java là gì?")
                .explanation("Java là ngôn ngữ lập trình.")
                .orderIndex(1)
                .build();
        Course course = Course.builder().id(99L).accessTier(SubscriptionTier.FREE).build();
        Lesson lesson = Lesson.builder().id(98L).course(course).build();
        Quiz quiz = Quiz.builder().id(quizId).lesson(lesson).title("Quiz 1").build();
        User user = User.builder()
                .id(userId)
                .username("free-user")
                .password("encoded")
                .role("STUDENT")
                .email("free@example.com")
                .plan(SubscriptionTier.FREE)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(quizResultRepository.countByUser_IdAndQuiz_Id(userId, quizId)).thenReturn(0L);
        when(quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId)).thenReturn(java.util.List.of(question));
        when(quizOptionRepository.findByQuestion_IdOrderByCodeAscIdAsc(questionId)).thenReturn(java.util.List.of(optionA, optionB));
        when(quizResultRepository.save(any(QuizResult.class))).thenAnswer(invocation -> {
            QuizResult result = invocation.getArgument(0);
            result.setId(500L);
            return result;
        });

        QuizSubmitRequest request = new QuizSubmitRequest();
        request.setUserId(userId);
        QuizSubmitRequest.QuizSubmitAnswer answer = new QuizSubmitRequest.QuizSubmitAnswer();
        answer.setQuestionId(questionId);
        answer.setOptionId(optionB.getId());
        request.setAnswers(java.util.List.of(answer));

        QuizSubmitResponse response = quizService.submitAnswers(quizId, request);

        assertEquals(0f, response.getScore());
        assertEquals(false, response.isReviewAllowed());
        assertEquals(false, response.isDetailsAvailable());
        assertEquals(0, response.getResults().size());
        assertEquals(null, response.getCorrectAnswers());
    }

    @Test
    void getReview_plusUser_returnsDetailedAnswers() {
        Long userId = 42L;
        Long quizId = 420L;
        User user = User.builder()
                .id(userId)
                .username("plus-user")
                .password("encoded")
                .role("STUDENT")
                .email("plus@example.com")
                .plan(SubscriptionTier.PLUS)
                .build();
        Quiz quiz = Quiz.builder().id(quizId).title("Quiz nâng cao").build();
        QuizResult result = QuizResult.builder().id(600L).quiz(quiz).score(100f).build();
        QuizQuestion question = QuizQuestion.builder()
                .id(421L)
                .prompt("JVM là gì?")
                .explanation("JVM là môi trường chạy bytecode Java.")
                .orderIndex(1)
                .build();
        QuizOption chosen = QuizOption.builder().id(11L).code("A").content("Java Virtual Machine").build();
        QuizResultAnswer detail = QuizResultAnswer.builder()
                .id(1L)
                .quizResult(result)
                .question(question)
                .chosenOption(chosen)
                .correctOption(chosen)
                .correct(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(quizRepository.existsById(quizId)).thenReturn(true);
        when(quizResultRepository.findTopByUser_IdAndQuiz_IdOrderBySubmittedAtDescIdDesc(userId, quizId)).thenReturn(Optional.of(result));
        when(quizResultAnswerRepository.findByQuizResult_IdOrderByQuestion_OrderIndexAscIdAsc(result.getId()))
                .thenReturn(java.util.List.of(detail));

        QuizSubmitResponse response = quizService.getReview(userId, quizId);

        assertEquals(true, response.isReviewAllowed());
        assertEquals(true, response.isDetailsAvailable());
        assertEquals(1, response.getCorrectAnswers());
        assertEquals("JVM là gì?", response.getResults().get(0).getPrompt());
        assertEquals("JVM là môi trường chạy bytecode Java.", response.getResults().get(0).getExplanation());
    }
}
