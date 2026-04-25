package com.web.study_analysis.study_business.quiz.controller;

import com.web.study_analysis.study_business.quiz.dto.QuizRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizResultRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizTakeQuestionResponse;
import com.web.study_analysis.study_business.quiz.service.QuizQuestionService;
import com.web.study_analysis.study_business.quiz.service.QuizService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizController {
    QuizService quizService;
    QuizQuestionService quizQuestionService;

    @PostMapping("/lessons/{lessonId}/quizzes")
    public QuizResponse createQuiz(@PathVariable Long lessonId, @Valid @RequestBody QuizRequest request) {
        return quizService.create(lessonId, request);
    }

    @GetMapping("/lessons/{lessonId}/quizzes")
    public List<QuizResponse> listQuizzes(@PathVariable Long lessonId) {
        return quizService.listByLesson(lessonId);
    }

    @PutMapping("/quizzes/{quizId}")
    public QuizResponse updateQuiz(@PathVariable Long quizId, @Valid @RequestBody QuizRequest request) {
        return quizService.update(quizId, request);
    }

    @DeleteMapping("/quizzes/{quizId}")
    public void deleteQuiz(@PathVariable Long quizId) {
        quizService.delete(quizId);
    }

    @PostMapping("/quiz-results")
    public void submitResult(@Valid @RequestBody QuizResultRequest request) {
        quizService.submitResult(request);
    }

    // Admin: soạn câu hỏi (A/B/C/D, 1 đáp án đúng)
    @GetMapping("/quizzes/{quizId}/questions")
    public List<QuizQuestionResponse> listQuestions(@PathVariable Long quizId) {
        return quizQuestionService.listByQuiz(quizId);
    }

    @PostMapping("/quizzes/{quizId}/questions")
    public QuizQuestionResponse createQuestion(@PathVariable Long quizId, @Valid @RequestBody QuizQuestionRequest request) {
        return quizQuestionService.create(quizId, request);
    }

    @PutMapping("/quiz-questions/{questionId}")
    public QuizQuestionResponse updateQuestion(@PathVariable Long questionId, @Valid @RequestBody QuizQuestionRequest request) {
        return quizQuestionService.update(questionId, request);
    }

    @DeleteMapping("/quiz-questions/{questionId}")
    public void deleteQuestion(@PathVariable Long questionId) {
        quizQuestionService.delete(questionId);
    }

    // Student: lấy đề (không lộ đáp án đúng)
    @GetMapping("/quizzes/{quizId}/take")
    public List<QuizTakeQuestionResponse> takeQuiz(@PathVariable Long quizId) {
        return quizQuestionService.take(quizId);
    }

    // Student: nộp bài -> tính điểm + lưu kết quả
    @PostMapping("/quizzes/{quizId}/submit")
    public QuizSubmitResponse submitQuiz(@PathVariable Long quizId, @Valid @RequestBody QuizSubmitRequest request) {
        return quizService.submitAnswers(quizId, request);
    }

    /** Student: xem điểm đã nộp gần nhất (nếu có). */
    @GetMapping("/quizzes/{quizId}/users/{userId}/latest-score")
    public Float latestScore(@PathVariable Long quizId, @PathVariable Long userId) {
        return quizService.getLatestScore(userId, quizId);
    }
}
