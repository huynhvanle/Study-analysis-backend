package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.quiz.entity.QuizOption;
import com.web.study_analysis.study_business.quiz.dto.QuizEditStateResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizResultRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitRequest;
import com.web.study_analysis.study_business.quiz.dto.QuizSubmitResponse;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.entity.QuizResult;
import com.web.study_analysis.study_business.quiz.entity.QuizResultAnswer;
import com.web.study_analysis.study_business.quiz.repository.QuizOptionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultAnswerRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.tier.SubscriptionAccess;
import com.web.study_analysis.study_business.tier.SubscriptionTier;
import com.web.study_analysis.user.entity.User;
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
    QuizResultAnswerRepository quizResultAnswerRepository;

    @Transactional(readOnly = true)
    public Float getLatestScore(Long userId, Long quizId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOTFOUND);
        }
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        return quizResultRepository.findTopByUser_IdAndQuiz_IdOrderBySubmittedAtDescIdDesc(userId, quizId)
                .map(QuizResult::getScore)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public QuizSubmitResponse getReview(Long userId, Long quizId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        if (!canReviewQuizAnswers(user)) {
            throw new AppException(ErrorCode.PLUS_QUIZ_REVIEW_REQUIRED);
        }
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        QuizResult latest = quizResultRepository.findTopByUser_IdAndQuiz_IdOrderBySubmittedAtDescIdDesc(userId, quizId)
                .orElse(null);
        if (latest == null) {
            return QuizSubmitResponse.builder()
                    .quizId(quizId)
                    .reviewAllowed(true)
                    .detailsAvailable(false)
                    .results(List.of())
                    .build();
        }
        return buildSubmitResponse(latest, true);
    }

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
        assertQuizEditable(quizId);
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
        assertQuizEditable(quizId);
        quizRepository.deleteById(quizId);
    }

    @Transactional(readOnly = true)
    public QuizEditStateResponse getEditState(Long quizId) {
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        boolean hasSubmittedResults = quizResultRepository.existsByQuiz_Id(quizId);
        return QuizEditStateResponse.builder()
                .quizId(quizId)
                .editable(!hasSubmittedResults)
                .hasSubmittedResults(hasSubmittedResults)
                .build();
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
        SubscriptionAccess.requireLearnAccess(user, quiz.getLesson().getCourse());
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
        SubscriptionAccess.requireLearnAccess(user, quiz.getLesson().getCourse());

        if (quizResultRepository.countByUser_IdAndQuiz_Id(user.getId(), quizId) > 0) {
            throw new AppException(ErrorCode.QUIZ_ALREADY_SUBMITTED);
        }

        var questions = quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId);
        int total = questions.size();
        if (total == 0) {
            // still store a result (score 0)
            QuizResult result = QuizResult.builder().user(user).quiz(quiz).score(0f).build();
            quizResultRepository.save(result);
            return QuizSubmitResponse.builder()
                    .quizId(quizId)
                    .totalQuestions(0)
                    .correctAnswers(0)
                    .score(0f)
                    .submittedAt(result.getSubmittedAt())
                    .reviewAllowed(canReviewQuizAnswers(user))
                    .detailsAvailable(false)
                    .results(java.util.List.of())
                    .build();
        }

        var answerMap = new java.util.HashMap<Long, Long>();
        if (request.getAnswers() != null) {
            for (var a : request.getAnswers()) {
                if (a == null || a.getQuestionId() == null || a.getOptionId() == null) continue;
                answerMap.put(a.getQuestionId(), a.getOptionId());
            }
        }

        int correct = 0;
        java.util.List<QuizResultAnswer> answerDetails = new java.util.ArrayList<>();
        for (var q : questions) {
            Long chosenOptionId = answerMap.get(q.getId());
            QuizOption chosenOption = null;
            QuizOption correctOption = null;
            var opts = quizOptionRepository.findByQuestion_IdOrderByCodeAscIdAsc(q.getId());
            for (var o : opts) {
                if (Boolean.TRUE.equals(o.getCorrect())) {
                    correctOption = o;
                }
                if (chosenOptionId != null && o.getId().equals(chosenOptionId)) {
                    chosenOption = o;
                }
            }
            boolean isCorrect = chosenOption != null && correctOption != null && correctOption.getId().equals(chosenOption.getId());
            if (isCorrect) correct += 1;
            answerDetails.add(QuizResultAnswer.builder()
                    .question(q)
                    .chosenOption(chosenOption)
                    .correctOption(correctOption)
                    .correct(isCorrect)
                    .build());
        }

        float score = (float) (correct * 100.0 / total);
        QuizResult result = QuizResult.builder().user(user).quiz(quiz).score(score).build();
        result = quizResultRepository.save(result);
        for (QuizResultAnswer detail : answerDetails) {
            detail.setQuizResult(result);
        }
        if (!answerDetails.isEmpty()) {
            quizResultAnswerRepository.saveAll(answerDetails);
        }

        return buildSubmitResponse(result, canReviewQuizAnswers(user));
    }

    private QuizResponse toQuizResponse(Quiz q) {
        return QuizResponse.builder()
                .id(q.getId())
                .lessonId(q.getLesson().getId())
                .title(q.getTitle())
                .build();
    }

    private boolean canReviewQuizAnswers(User user) {
        SubscriptionTier plan = user.getPlan() != null ? user.getPlan() : SubscriptionTier.FREE;
        return plan == SubscriptionTier.PLUS;
    }

    private QuizSubmitResponse buildSubmitResponse(QuizResult result, boolean reviewAllowed) {
        if (result == null) {
            return null;
        }

        List<QuizResultAnswer> answers = quizResultAnswerRepository.findByQuizResult_IdOrderByQuestion_OrderIndexAscIdAsc(result.getId());
        if (!reviewAllowed) {
            return QuizSubmitResponse.builder()
                    .quizId(result.getQuiz().getId())
                    .score(result.getScore())
                    .submittedAt(result.getSubmittedAt())
                    .reviewAllowed(false)
                    .detailsAvailable(false)
                    .results(List.of())
                    .build();
        }

        int correctAnswers = (int) answers.stream().filter(a -> Boolean.TRUE.equals(a.getCorrect())).count();
        boolean hasDetails = !answers.isEmpty();
        return QuizSubmitResponse.builder()
                .quizId(result.getQuiz().getId())
                .totalQuestions(hasDetails ? answers.size() : null)
                .correctAnswers(hasDetails ? correctAnswers : null)
                .score(result.getScore())
                .submittedAt(result.getSubmittedAt())
                .reviewAllowed(true)
                .detailsAvailable(hasDetails)
                .results(hasDetails ? answers.stream().map(this::toQuestionResult).toList() : List.of())
                .build();
    }

    private QuizSubmitResponse.QuestionResult toQuestionResult(QuizResultAnswer answer) {
        QuizOption chosen = answer.getChosenOption();
        QuizOption correct = answer.getCorrectOption();
        return QuizSubmitResponse.QuestionResult.builder()
                .questionId(answer.getQuestion().getId())
                .prompt(answer.getQuestion().getPrompt())
                .explanation(answer.getQuestion().getExplanation())
                .chosenOptionId(chosen != null ? chosen.getId() : null)
                .chosenOptionCode(chosen != null ? chosen.getCode() : null)
                .chosenOptionContent(chosen != null ? chosen.getContent() : null)
                .correctOptionId(correct != null ? correct.getId() : null)
                .correctOptionCode(correct != null ? correct.getCode() : null)
                .correctOptionContent(correct != null ? correct.getContent() : null)
                .correct(Boolean.TRUE.equals(answer.getCorrect()))
                .build();
    }

    private void assertQuizEditable(Long quizId) {
        if (quizResultRepository.existsByQuiz_Id(quizId)) {
            throw new AppException(ErrorCode.QUIZ_RESULTS_LOCKED);
        }
    }
}
