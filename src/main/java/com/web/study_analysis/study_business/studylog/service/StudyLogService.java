package com.web.study_analysis.study_business.studylog.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.studylog.dto.StudyLogRequest;
import com.web.study_analysis.study_business.studylog.entity.StudyLog;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import com.web.study_analysis.study_business.tier.SubscriptionAccess;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StudyLogService {
    StudyLogRepository studyLogRepository;
    UserRepository userRepository;
    LessonService lessonService;

    @Transactional
    public void log(StudyLogRequest request) {
        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        var lesson = lessonService.getEntityById(request.getLessonId());
        SubscriptionAccess.requireLearnAccess(user, lesson.getCourse());
        StudyLog entry = StudyLog.builder()
                .user(user)
                .lesson(lesson)
                .timeSpent(request.getTimeSpent())
                .score(request.getScore())
                .attempt(request.getAttempt())
                .build();
        studyLogRepository.save(entry);
    }
}
