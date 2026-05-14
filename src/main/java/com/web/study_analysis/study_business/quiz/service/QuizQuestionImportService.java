package com.web.study_analysis.study_business.quiz.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionImportErrorResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionImportResponse;
import com.web.study_analysis.study_business.quiz.dto.QuizQuestionRequest;
import com.web.study_analysis.study_business.quiz.repository.QuizQuestionRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.apache.poi.EmptyFileException;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.openxml4j.exceptions.NotOfficeXmlFileException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizQuestionImportService {
    static final List<String> REQUIRED_HEADERS = List.of(
            "prompt", "optionA", "optionB", "optionC", "optionD", "correctCode"
    );

    static final Set<String> ALLOWED_CORRECT_CODES = Set.of("A", "B", "C", "D");

    QuizRepository quizRepository;
    QuizQuestionRepository quizQuestionRepository;
    QuizResultRepository quizResultRepository;
    QuizQuestionService quizQuestionService;

    @Transactional
    public QuizQuestionImportResponse importQuestions(Long quizId, MultipartFile file) {
        if (!quizRepository.existsById(quizId)) {
            throw new AppException(ErrorCode.QUIZ_NOT_FOUND);
        }
        if (quizResultRepository.existsByQuiz_Id(quizId)) {
            throw new AppException(ErrorCode.QUIZ_IMPORT_NOT_ALLOWED);
        }

        validateFile(file);

        ParsedSheet parsedSheet = parseSheet(quizId, file);
        if (!parsedSheet.errors.isEmpty()) {
            return buildResponse(quizId, file.getOriginalFilename(), parsedSheet.totalRows, parsedSheet.requests.size(), 0, parsedSheet.errors);
        }

        int createdQuestions = 0;
        for (QuizQuestionRequest request : parsedSheet.requests) {
            quizQuestionService.create(quizId, request);
            createdQuestions++;
        }

        return buildResponse(quizId, file.getOriginalFilename(), parsedSheet.totalRows, parsedSheet.requests.size(), createdQuestions, List.of());
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.QUIZ_IMPORT_FILE_INVALID);
        }
        String originalFilename = String.valueOf(file.getOriginalFilename()).trim().toLowerCase(Locale.ROOT);
        if (!originalFilename.endsWith(".xlsx")) {
            throw new AppException(ErrorCode.QUIZ_IMPORT_FILE_INVALID);
        }
    }

    private ParsedSheet parseSheet(Long quizId, MultipartFile file) {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) {
                return ParsedSheet.withError(error(1, "sheet", "File Excel không có sheet nào."));
            }

            Sheet sheet = workbook.getSheetAt(0);
            FormulaEvaluator formulaEvaluator = workbook.getCreationHelper().createFormulaEvaluator();
            DataFormatter formatter = new DataFormatter(Locale.ROOT);

            int headerRowIndex = findFirstNonEmptyRow(sheet, formatter, formulaEvaluator);
            if (headerRowIndex < 0) {
                return ParsedSheet.withError(error(1, "header", "Sheet đầu tiên chưa có dòng tiêu đề."));
            }

            Row headerRow = sheet.getRow(headerRowIndex);
            Map<String, Integer> headerIndexes = extractHeaderIndexes(headerRow, formatter, formulaEvaluator);

            List<QuizQuestionImportErrorResponse> headerErrors = validateHeaders(headerIndexes, headerRowIndex + 1);
            if (!headerErrors.isEmpty()) {
                return new ParsedSheet(0, List.of(), headerErrors);
            }

            List<QuizQuestionRequest> requests = new ArrayList<>();
            List<QuizQuestionImportErrorResponse> errors = new ArrayList<>();
            int nextOrderIndex = loadNextOrderIndex(quizId);
            int totalRows = 0;

            for (int rowIndex = headerRowIndex + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (isRowBlank(row, headerIndexes, formatter, formulaEvaluator)) {
                    continue;
                }

                totalRows++;
                int excelRowNumber = rowIndex + 1;
                Map<String, String> values = readValues(row, headerIndexes, formatter, formulaEvaluator);
                List<QuizQuestionImportErrorResponse> rowErrors = validateRow(values, excelRowNumber);
                if (!rowErrors.isEmpty()) {
                    errors.addAll(rowErrors);
                    continue;
                }

                requests.add(toRequest(values, nextOrderIndex++));
            }

            if (requests.isEmpty() && errors.isEmpty()) {
                errors.add(error(headerRowIndex + 2, "row", "File Excel chưa có dòng dữ liệu nào để import."));
            }

            return new ParsedSheet(totalRows, requests, errors);
        } catch (IOException | EncryptedDocumentException | EmptyFileException | NotOfficeXmlFileException ex) {
            throw new AppException(ErrorCode.QUIZ_IMPORT_FILE_INVALID);
        }
    }

    private int loadNextOrderIndex(Long quizId) {
        int maxOrderIndex = 0;
        for (var question : quizQuestionRepository.findByQuiz_IdOrderByOrderIndexAscIdAsc(quizId)) {
            if (question.getOrderIndex() != null && question.getOrderIndex() > maxOrderIndex) {
                maxOrderIndex = question.getOrderIndex();
            }
        }
        return maxOrderIndex + 1;
    }

    private int findFirstNonEmptyRow(Sheet sheet, DataFormatter formatter, FormulaEvaluator formulaEvaluator) {
        for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) {
                continue;
            }
            for (Cell cell : row) {
                if (cell != null && !formatter.formatCellValue(cell, formulaEvaluator).trim().isBlank()) {
                    return rowIndex;
                }
            }
        }
        return -1;
    }

    private Map<String, Integer> extractHeaderIndexes(Row headerRow, DataFormatter formatter, FormulaEvaluator formulaEvaluator) {
        Map<String, Integer> headerIndexes = new LinkedHashMap<>();
        short lastCellNum = headerRow.getLastCellNum();
        if (lastCellNum < 0) {
            return headerIndexes;
        }
        for (int cellIndex = 0; cellIndex < lastCellNum; cellIndex++) {
            String raw = readCell(headerRow, cellIndex, formatter, formulaEvaluator);
            if (raw.isBlank()) {
                continue;
            }
            headerIndexes.putIfAbsent(normalizeHeader(raw), cellIndex);
        }
        return headerIndexes;
    }

    private List<QuizQuestionImportErrorResponse> validateHeaders(Map<String, Integer> headerIndexes, int headerRowNumber) {
        List<QuizQuestionImportErrorResponse> errors = new ArrayList<>();
        for (String requiredHeader : REQUIRED_HEADERS) {
            if (!headerIndexes.containsKey(normalizeHeader(requiredHeader))) {
                errors.add(error(headerRowNumber, requiredHeader, "Thiếu cột bắt buộc `" + requiredHeader + "`."));
            }
        }
        return errors;
    }

    private boolean isRowBlank(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter, FormulaEvaluator formulaEvaluator) {
        if (row == null) {
            return true;
        }
        for (Integer cellIndex : headerIndexes.values()) {
            if (!readCell(row, cellIndex, formatter, formulaEvaluator).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private Map<String, String> readValues(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter, FormulaEvaluator formulaEvaluator) {
        Map<String, String> values = new LinkedHashMap<>();
        for (String requiredHeader : REQUIRED_HEADERS) {
            Integer cellIndex = headerIndexes.get(normalizeHeader(requiredHeader));
            values.put(requiredHeader, readCell(row, cellIndex, formatter, formulaEvaluator));
        }
        return values;
    }

    private List<QuizQuestionImportErrorResponse> validateRow(Map<String, String> values, int rowNumber) {
        List<QuizQuestionImportErrorResponse> errors = new ArrayList<>();

        validateRequiredText(values.get("prompt"), "prompt", rowNumber, errors);
        validateRequiredText(values.get("optionA"), "optionA", rowNumber, errors);
        validateRequiredText(values.get("optionB"), "optionB", rowNumber, errors);
        validateRequiredText(values.get("optionC"), "optionC", rowNumber, errors);
        validateRequiredText(values.get("optionD"), "optionD", rowNumber, errors);

        String correctCode = normalizeCode(values.get("correctCode"));
        if (!ALLOWED_CORRECT_CODES.contains(correctCode)) {
            errors.add(error(rowNumber, "correctCode", "Chỉ chấp nhận một trong các giá trị A, B, C, D."));
        }

        validateMaxLength(values.get("prompt"), "prompt", rowNumber, 1000, errors);
        validateMaxLength(values.get("optionA"), "optionA", rowNumber, 1000, errors);
        validateMaxLength(values.get("optionB"), "optionB", rowNumber, 1000, errors);
        validateMaxLength(values.get("optionC"), "optionC", rowNumber, 1000, errors);
        validateMaxLength(values.get("optionD"), "optionD", rowNumber, 1000, errors);

        return errors;
    }

    private QuizQuestionRequest toRequest(Map<String, String> values, int orderIndex) {
        QuizQuestionRequest request = new QuizQuestionRequest();
        request.setOrderIndex(orderIndex);
        request.setPrompt(values.get("prompt").trim());
        request.setOptionA(values.get("optionA").trim());
        request.setOptionB(values.get("optionB").trim());
        request.setOptionC(values.get("optionC").trim());
        request.setOptionD(values.get("optionD").trim());
        request.setCorrectCode(normalizeCode(values.get("correctCode")));
        return request;
    }

    private void validateRequiredText(String value, String field, int rowNumber, List<QuizQuestionImportErrorResponse> errors) {
        if (value == null || value.trim().isBlank()) {
            errors.add(error(rowNumber, field, "Không được để trống."));
        }
    }

    private void validateMaxLength(String value, String field, int rowNumber, int maxLength, List<QuizQuestionImportErrorResponse> errors) {
        if (value != null && value.trim().length() > maxLength) {
            errors.add(error(rowNumber, field, "Không được vượt quá " + maxLength + " ký tự."));
        }
    }

    private String readCell(Row row, Integer cellIndex, DataFormatter formatter, FormulaEvaluator formulaEvaluator) {
        if (row == null || cellIndex == null || cellIndex < 0) {
            return "";
        }
        Cell cell = row.getCell(cellIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell, formulaEvaluator).trim();
    }

    private String normalizeHeader(String value) {
        return String.valueOf(value).trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCode(String value) {
        return String.valueOf(value == null ? "" : value).trim().toUpperCase(Locale.ROOT);
    }

    private QuizQuestionImportResponse buildResponse(Long quizId, String fileName, int totalRows, int validRows, int createdQuestions,
                                                     List<QuizQuestionImportErrorResponse> errors) {
        return QuizQuestionImportResponse.builder()
                .quizId(quizId)
                .fileName(fileName)
                .totalRows(totalRows)
                .validRows(validRows)
                .createdQuestions(createdQuestions)
                .errors(errors)
                .build();
    }

    private QuizQuestionImportErrorResponse error(int rowNumber, String field, String message) {
        return QuizQuestionImportErrorResponse.builder()
                .rowNumber(rowNumber)
                .field(field)
                .message(message)
                .build();
    }

    private static class ParsedSheet {
        int totalRows;
        List<QuizQuestionRequest> requests;
        List<QuizQuestionImportErrorResponse> errors;

        ParsedSheet(int totalRows, List<QuizQuestionRequest> requests, List<QuizQuestionImportErrorResponse> errors) {
            this.totalRows = totalRows;
            this.requests = requests;
            this.errors = errors;
        }

        static ParsedSheet withError(QuizQuestionImportErrorResponse error) {
            return new ParsedSheet(0, List.of(), List.of(error));
        }
    }
}
