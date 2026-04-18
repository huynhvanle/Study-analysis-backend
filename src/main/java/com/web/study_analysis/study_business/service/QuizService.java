package com.web.study_analysis.study_business.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.dto.QuizRequest;
import com.web.study_analysis.study_business.dto.QuizResponse;
import com.web.study_analysis.study_business.dto.QuizResultRequest;
import com.web.study_analysis.study_business.model.Quiz;
import com.web.study_analysis.study_business.model.QuizResult;
import com.web.study_analysis.study_business.repository.QuizRepository;
import com.web.study_analysis.study_business.repository.QuizResultRepository;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizService {
    QuizRepository quizRepository;
    QuizResultRepository quizResultRepository;
    LessonService lessonService;
    UserRepository userRepository;

    @Transactional
    public QuizResponse create(Long lessonId, QuizRequest request) {
        var lesson = lessonService.getEntityById(lessonId);
        Quiz quiz = Quiz.builder().lesson(lesson).title(request.getTitle()).build();
        return toQuizResponse(quizRepository.save(quiz));
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> listByLesson(Long lessonId) {
        lessonService.getEntityById(lessonId);
        return quizRepository.findByLesson_Id(lessonId).stream().map(this::toQuizResponse).toList();
    }

    @Transactional
    public void submitResult(QuizResultRequest request) {
        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        Quiz quiz = quizRepository.findById(request.getQuizId())
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_FOUND));
        QuizResult result = QuizResult.builder()
                .user(user)
                .quiz(quiz)
                .score(request.getScore())
                .build();
        quizResultRepository.save(result);
    }

    private QuizResponse toQuizResponse(Quiz q) {
        return QuizResponse.builder()
                .id(q.getId())
                .lessonId(q.getLesson().getId())
                .title(q.getTitle())
                .build();
    }
}
