package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.quiz.dto.*;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.entity.QuizOption;
import com.web.study_analysis.study_business.quiz.entity.QuizQuestion;
import com.web.study_analysis.study_business.quiz.repository.QuizOptionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizQuestionService {
    QuizRepository quizRepository;
    QuizQuestionRepository questionRepository;
    QuizOptionRepository optionRepository;

    @Transactional
    public QuizQuestionResponse create(Long quizId, QuizQuestionRequest request) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_FOUND));

        String correct = normalizeCode(request.getCorrectCode());
        if (!Set.of("A", "B", "C", "D").contains(correct)) {
            throw new AppException(ErrorCode.QUIZ_QUESTION_INVALID);
        }

        QuizQuestion q = QuizQuestion.builder()
                .quiz(quiz)
                .prompt(request.getPrompt().trim())
                .orderIndex(request.getOrderIndex())
                .build();
        q = questionRepository.save(q);

        List<QuizOption> opts = List.of(
                buildOption(q, "A", request.getOptionA(), correct.equals("A")),
                buildOption(q, "B", request.getOptionB(), correct.equals("B")),
                buildOption(q, "C", request.getOptionC(), correct.equals("C")),
                buildOption(q, "D", request.getOptionD(), correct.equals("D"))
        );
        optionRepository.saveAll(opts);

        return get(q.getId());
    }

    @Transactional(readOnly = true)
    public List<QuizQuestionResponse> listByQuiz(Long quizId) {
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        return questionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public QuizQuestionResponse get(Long questionId) {
        QuizQuestion q = questionRepository.findById(questionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_QUESTION_NOT_FOUND));
        return toResponse(q);
    }

    @Transactional
    public QuizQuestionResponse update(Long questionId, QuizQuestionRequest request) {
        QuizQuestion q = questionRepository.findById(questionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_QUESTION_NOT_FOUND));

        String correct = normalizeCode(request.getCorrectCode());
        if (!Set.of("A", "B", "C", "D").contains(correct)) {
            throw new AppException(ErrorCode.QUIZ_QUESTION_INVALID);
        }

        q.setPrompt(request.getPrompt().trim());
        q.setOrderIndex(request.getOrderIndex());
        questionRepository.save(q);

        // Update (or create) options A-D
        Map<String, QuizOption> byCode = optionRepository.findByQuestion_IdOrderByCodeAscIdAsc(q.getId()).stream()
                .collect(HashMap::new, (m, o) -> m.put(normalizeCode(o.getCode()), o), HashMap::putAll);

        upsertOption(q, byCode, "A", request.getOptionA(), correct.equals("A"));
        upsertOption(q, byCode, "B", request.getOptionB(), correct.equals("B"));
        upsertOption(q, byCode, "C", request.getOptionC(), correct.equals("C"));
        upsertOption(q, byCode, "D", request.getOptionD(), correct.equals("D"));

        return get(q.getId());
    }

    @Transactional
    public void delete(Long questionId) {
        if (!questionRepository.existsById(questionId)) {
            throw new AppException(ErrorCode.QUIZ_QUESTION_NOT_FOUND);
        }
        questionRepository.deleteById(questionId);
    }

    @Transactional(readOnly = true)
    public List<QuizTakeQuestionResponse> take(Long quizId) {
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        return questionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId).stream()
                .map(q -> QuizTakeQuestionResponse.builder()
                        .id(q.getId())
                        .orderIndex(q.getOrderIndex())
                        .prompt(q.getPrompt())
                        .options(optionRepository.findByQuestion_IdOrderByCodeAscIdAsc(q.getId()).stream()
                                .map(o -> QuizTakeOptionResponse.builder()
                                        .id(o.getId())
                                        .code(o.getCode())
                                        .content(o.getContent())
                                        .build())
                                .toList())
                        .build())
                .toList();
    }

    private QuizQuestionResponse toResponse(QuizQuestion q) {
        List<QuizOptionResponse> opts = optionRepository.findByQuestion_IdOrderByCodeAscIdAsc(q.getId()).stream()
                .map(o -> QuizOptionResponse.builder()
                        .id(o.getId())
                        .code(o.getCode())
                        .content(o.getContent())
                        .correct(Boolean.TRUE.equals(o.getCorrect()))
                        .build())
                .toList();
        return QuizQuestionResponse.builder()
                .id(q.getId())
                .quizId(q.getQuiz().getId())
                .prompt(q.getPrompt())
                .orderIndex(q.getOrderIndex())
                .options(opts)
                .build();
    }

    private QuizOption buildOption(QuizQuestion q, String code, String content, boolean correct) {
        return QuizOption.builder()
                .question(q)
                .code(code)
                .content(content == null ? "" : content.trim())
                .correct(correct)
                .build();
    }

    private void upsertOption(QuizQuestion q, Map<String, QuizOption> byCode, String code, String content, boolean correct) {
        QuizOption o = byCode.get(code);
        if (o == null) {
            o = QuizOption.builder().question(q).code(code).build();
        }
        o.setContent(content == null ? "" : content.trim());
        o.setCorrect(correct);
        optionRepository.save(o);
    }

    private String normalizeCode(String s) {
        return String.valueOf(s == null ? "" : s).trim().toUpperCase(Locale.ROOT);
    }
}

