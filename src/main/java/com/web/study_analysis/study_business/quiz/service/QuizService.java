package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.quiz.dto.QuizRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizResultRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitResponse;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import com.web.study_analysis.study_business.quiz.repository.QuizOptionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
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
    QuizQuestionRepository quizQuestionRepository;
    QuizOptionRepository quizOptionRepository;

    @Transactional
    public QuizResponse create(Long lessonId, QuizRequest request) {
        var lesson = lessonService.getEntityById(lessonId);
        Quiz quiz = Quiz.builder().lesson(lesson).title(request.getTitle()).build();
        return toQuizResponse(quizRepository.save(quiz));
    }

    @Transactional
    public QuizResponse update(Long quizId, QuizRequest request) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_FOUND));
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            quiz.setTitle(request.getTitle());
        }
        return toQuizResponse(quizRepository.save(quiz));
    }

    @Transactional
    public void delete(Long quizId) {
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        quizRepository.deleteById(quizId);
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

    @Transactional
    public QuizSubmitResponse submitAnswers(Long quizId, QuizSubmitRequest request) {
        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_FOUND));

        var questions = quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId);
        int total = questions.size();
        if (total == 0) {
            // still store a result (score 0)
            QuizResult result = QuizResult.builder().user(user).quiz(quiz).score(0f).build();
            quizResultRepository.save(result);
            return QuizSubmitResponse.builder().quizId(quizId).totalQuestions(0).correctAnswers(0).score(0f).build();
        }

        var answerMap = new java.util.HashMap<Long, Long>();
        if (request.getAnswers() != null) {
            for (var a : request.getAnswers()) {
                if (a == null || a.getQuestionId() == null || a.getOptionId() == null) continue;
                answerMap.put(a.getQuestionId(), a.getOptionId());
            }
        }

        int correct = 0;
        for (var q : questions) {
            Long chosenOptionId = answerMap.get(q.getId());
            if (chosenOptionId == null) continue;
            var opts = quizOptionRepository.findByQuestion_IdOrderByCodeAscIdAsc(q.getId());
            for (var o : opts) {
                if (o.getId().equals(chosenOptionId) && Boolean.TRUE.equals(o.getCorrect())) {
                    correct += 1;
                    break;
                }
            }
        }

        float score = (float) (correct * 100.0 / total);
        QuizResult result = QuizResult.builder().user(user).quiz(quiz).score(score).build();
        quizResultRepository.save(result);

        return QuizSubmitResponse.builder()
                .quizId(quizId)
                .totalQuestions(total)
                .correctAnswers(correct)
                .score(score)
                .build();
    }

    private QuizResponse toQuizResponse(Quiz q) {
        return QuizResponse.builder()
                .id(q.getId())
                .lessonId(q.getLesson().getId())
                .title(q.getTitle())
                .build();
    }
}
