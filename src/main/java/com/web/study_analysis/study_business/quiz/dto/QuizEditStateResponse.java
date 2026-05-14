package com.web.study_analysis.study_business.quiz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizEditStateResponse {
    Long quizId;
    boolean editable;
    boolean hasSubmittedResults;
}
