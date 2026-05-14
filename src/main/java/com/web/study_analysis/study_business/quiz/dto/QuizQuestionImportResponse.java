package com.web.study_analysis.study_business.quiz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionImportResponse {
    Long quizId;
    String fileName;
    int totalRows;
    int validRows;
    int createdQuestions;
    List<QuizQuestionImportErrorResponse> errors;
}
