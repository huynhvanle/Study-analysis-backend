package com.web.study_analysis.study_business.quiz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionImportErrorResponse {
    Integer rowNumber;
    String field;
    String message;
}
