package com.web.study_analysis.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Chỉ áp cho {@link RestController} — lỗi forward trang tĩnh / {@code @Controller} view không trả JSON 999 ra trình duyệt.
 */
@ControllerAdvice(annotations = RestController.class)
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiReponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String msg = String.valueOf(ex.getMostSpecificCause().getMessage()).toLowerCase();
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        ErrorCode code = ErrorCode.DUPLICATE_DATA;
        if (msg.contains("email")) {
            code = ErrorCode.EXISTED_EMAIL;
        } else if (msg.contains("username") || msg.contains("_username")) {
            code = ErrorCode.EXISTED_USER;
        }
        ApiReponse<Void> apiReponse = new ApiReponse<>();
        apiReponse.setCode(code.getCode());
        apiReponse.setMessgase(code.getMessgage());
        return ResponseEntity.badRequest().body(apiReponse);
    }

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiReponse<Void>> handlingAppException(AppException appException) {
        ErrorCode errorCode = appException.getErrorCode();
        ApiReponse<Void> apiReponse = new ApiReponse<>();
        apiReponse.setCode(errorCode.getCode());
        apiReponse.setMessgase(errorCode.getMessgage());
        HttpStatus status = errorCode == ErrorCode.UNAUTHENTICATED ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(apiReponse);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Void> noResource(NoResourceFoundException ex) {
        log.debug("Resource not found: {}", ex.getResourcePath());
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiReponse<Void>> hanglingValidationException(MethodArgumentNotValidException exception) {
        var fieldError = exception.getFieldError();
        String enumKey = fieldError != null ? fieldError.getDefaultMessage() : ErrorCode.INVALID_ENUMKEY.name();

        ErrorCode errorCode = ErrorCode.INVALID_ENUMKEY;
        try {
            errorCode = ErrorCode.valueOf(enumKey);
        } catch (IllegalArgumentException ignored) {
        }
        ApiReponse<Void> apiReponse = new ApiReponse<>();
        apiReponse.setCode(errorCode.getCode());
        apiReponse.setMessgase(errorCode.getMessgage());
        return ResponseEntity.badRequest().body(apiReponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiReponse<Void>> handlingException(Exception exception) {
        log.error("Unhandled error", exception);
        ApiReponse<Void> apiReponse = new ApiReponse<>();
        apiReponse.setCode(ErrorCode.UNCATEGORIZE.getCode());
        apiReponse.setMessgase(ErrorCode.UNCATEGORIZE.getMessgage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(apiReponse);
    }
}
