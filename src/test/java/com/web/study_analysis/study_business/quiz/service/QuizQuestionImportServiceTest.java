package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionImportResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionRequest;
import com.web.study_analysis.study_business.quiz.entity.QuizQuestion;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizQuestionImportServiceTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuizQuestionRepository quizQuestionRepository;

    @Mock
    private QuizResultRepository quizResultRepository;

    @Mock
    private QuizQuestionService quizQuestionService;

    @InjectMocks
    private QuizQuestionImportService quizQuestionImportService;

    @Test
    void importQuestions_validWorkbook_reusesQuizQuestionCreateFlow() throws IOException {
        Long quizId = 10L;
        allowImport(quizId);

        MultipartFile file = workbookFile(
                List.of("prompt", "optionA", "optionB", "optionC", "optionD", "correctCode"),
                List.of("Java là gì?", "Ngôn ngữ", "Hệ điều hành", "Trình duyệt", "CSDL", "A"),
                List.of("Spring Boot dùng để làm gì?", "Làm backend", "Thiết kế ảnh", "Chỉnh video", "Soạn nhạc", "A")
        );

        QuizQuestionImportResponse response = quizQuestionImportService.importQuestions(quizId, file);

        assertEquals(2, response.getTotalRows());
        assertEquals(2, response.getValidRows());
        assertEquals(2, response.getCreatedQuestions());
        assertTrue(response.getErrors().isEmpty());

        ArgumentCaptor<QuizQuestionRequest> requestCaptor = ArgumentCaptor.forClass(QuizQuestionRequest.class);
        verify(quizQuestionService, times(2)).create(eq(quizId), requestCaptor.capture());

        List<QuizQuestionRequest> capturedRequests = requestCaptor.getAllValues();
        assertEquals(1, capturedRequests.get(0).getOrderIndex());
        assertEquals("Java là gì?", capturedRequests.get(0).getPrompt());
        assertEquals("A", capturedRequests.get(0).getCorrectCode());
        assertEquals(2, capturedRequests.get(1).getOrderIndex());
        assertEquals("Spring Boot dùng để làm gì?", capturedRequests.get(1).getPrompt());
    }

    @Test
    void importQuestions_invalidRows_returnsErrorsWithoutCreatingQuestions() throws IOException {
        Long quizId = 11L;
        allowImport(quizId);

        MultipartFile file = workbookFile(
                List.of("prompt", "optionA", "optionB", "optionC", "optionD", "correctCode"),
                List.of("Câu hợp lệ", "A1", "B1", "C1", "D1", "A"),
                List.of("Câu sai đáp án", "A2", "B2", "C2", "D2", "E")
        );

        QuizQuestionImportResponse response = quizQuestionImportService.importQuestions(quizId, file);

        assertEquals(2, response.getTotalRows());
        assertEquals(1, response.getValidRows());
        assertEquals(0, response.getCreatedQuestions());
        assertEquals(2, response.getErrors().size());
        assertEquals(Integer.valueOf(3), response.getErrors().get(0).getRowNumber());
        verify(quizQuestionService, never()).create(eq(quizId), any());
    }

    @Test
    void importQuestions_quizAlreadyHasQuestions_autoAssignsOrderIndexAfterCurrentMax() throws IOException {
        Long quizId = 12L;
        allowImport(quizId);
        when(quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId)).thenReturn(List.of(
                QuizQuestion.builder().id(99L).orderIndex(5).prompt("Câu cũ").build()
        ));

        MultipartFile file = workbookFile(
                List.of("orderIndex", "prompt", "optionA", "optionB", "optionC", "optionD", "correctCode"),
                List.of("1", "Java là gì?", "Ngôn ngữ", "Hệ điều hành", "Trình duyệt", "CSDL", "A"),
                List.of("99", "Spring là gì?", "Framework", "DB", "OS", "IDE", "A")
        );

        QuizQuestionImportResponse response = quizQuestionImportService.importQuestions(quizId, file);

        assertEquals(2, response.getTotalRows());
        assertEquals(2, response.getValidRows());
        assertEquals(2, response.getCreatedQuestions());
        assertTrue(response.getErrors().isEmpty());
        ArgumentCaptor<QuizQuestionRequest> requestCaptor = ArgumentCaptor.forClass(QuizQuestionRequest.class);
        verify(quizQuestionService, times(2)).create(eq(quizId), requestCaptor.capture());
        List<QuizQuestionRequest> capturedRequests = requestCaptor.getAllValues();
        assertEquals(6, capturedRequests.get(0).getOrderIndex());
        assertEquals(7, capturedRequests.get(1).getOrderIndex());
    }

    @Test
    void importQuestions_quizAlreadyHasResults_rejectsImport() throws IOException {
        Long quizId = 13L;
        when(quizRepository.existsById(quizId)).thenReturn(true);
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(true);

        MultipartFile file = workbookFile(
                List.of("prompt", "optionA", "optionB", "optionC", "optionD", "correctCode"),
                List.of("Java là gì?", "Ngôn ngữ", "Hệ điều hành", "Trình duyệt", "CSDL", "A")
        );

        AppException exception = assertThrows(AppException.class,
                () -> quizQuestionImportService.importQuestions(quizId, file));

        assertEquals(ErrorCode.QUIZ_IMPORT_NOT_ALLOWED, exception.getErrorCode());
        verify(quizQuestionService, never()).create(eq(quizId), any());
    }

    @Test
    void importQuestions_blankOrderIndexInLegacyTemplate_stillImportsSuccessfully() throws IOException {
        Long quizId = 14L;
        allowImport(quizId);

        MultipartFile file = workbookFile(
                List.of("orderIndex", "prompt", "optionA", "optionB", "optionC", "optionD", "correctCode"),
                List.of("", "Java là gì?", "Ngôn ngữ", "Hệ điều hành", "Trình duyệt", "CSDL", "A")
        );

        QuizQuestionImportResponse response = quizQuestionImportService.importQuestions(quizId, file);

        assertEquals(1, response.getTotalRows());
        assertEquals(1, response.getValidRows());
        assertEquals(1, response.getCreatedQuestions());
        assertTrue(response.getErrors().isEmpty());
        ArgumentCaptor<QuizQuestionRequest> requestCaptor = ArgumentCaptor.forClass(QuizQuestionRequest.class);
        verify(quizQuestionService).create(eq(quizId), requestCaptor.capture());
        assertEquals(1, requestCaptor.getValue().getOrderIndex());
    }

    private void allowImport(Long quizId) {
        when(quizRepository.existsById(quizId)).thenReturn(true);
        when(quizResultRepository.existsByQuiz_Id(quizId)).thenReturn(false);
        when(quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId)).thenReturn(List.of());
    }

    @SafeVarargs
    private final MultipartFile workbookFile(List<String> headers, List<String>... rows) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("questions");
            var headerRow = sheet.createRow(0);
            for (int index = 0; index < headers.size(); index++) {
                headerRow.createCell(index).setCellValue(headers.get(index));
            }

            for (int rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var row = sheet.createRow(rowIndex + 1);
                List<String> values = rows[rowIndex];
                for (int cellIndex = 0; cellIndex < values.size(); cellIndex++) {
                    row.createCell(cellIndex).setCellValue(values.get(cellIndex));
                }
            }

            workbook.write(outputStream);
            return new MockMultipartFile(
                    "file",
                    "quiz-import.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    outputStream.toByteArray()
            );
        }
    }
}
