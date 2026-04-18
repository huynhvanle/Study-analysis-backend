package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.QuizRequest;
import com.web.study_analysis.study_business.dto.QuizResponse;
import com.web.study_analysis.study_business.dto.QuizResultRequest;
import com.web.study_analysis.study_business.service.QuizService;
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

    @PostMapping("/lessons/{lessonId}/quizzes")
    public QuizResponse createQuiz(@PathVariable Long lessonId, @Valid @RequestBody QuizRequest request) {
        return quizService.create(lessonId, request);
    }

    @GetMapping("/lessons/{lessonId}/quizzes")
    public List<QuizResponse> listQuizzes(@PathVariable Long lessonId) {
        return quizService.listByLesson(lessonId);
    }

    @PostMapping("/quiz-results")
    public void submitResult(@Valid @RequestBody QuizResultRequest request) {
        quizService.submitResult(request);
    }
}
