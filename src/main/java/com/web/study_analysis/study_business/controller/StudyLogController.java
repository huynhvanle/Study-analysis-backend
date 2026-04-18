package com.web.study_analysis.study_business.controller;

import com.web.study_analysis.study_business.dto.StudyLogRequest;
import com.web.study_analysis.study_business.service.StudyLogService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/study-logs")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StudyLogController {
    StudyLogService studyLogService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void log(@Valid @RequestBody StudyLogRequest request) {
        studyLogService.log(request);
    }
}
