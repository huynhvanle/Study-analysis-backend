package com.web.study_analysis.study_business.quiz.repository;

import com.web.study_analysis.study_business.quiz.entity.QuizResultAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface QuizResultAnswerRepository extends JpaRepository<QuizResultAnswer, Long> {
    List<QuizResultAnswer> findByQuizResult_IdOrderByQuestion_OrderIndexAscIdAsc(Long quizResultId);

    long deleteByQuizResult_Quiz_IdIn(Collection<Long> quizIds);
}
