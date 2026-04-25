package com.web.study_analysis.study_business.progress.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.progress.dto.ProgressRequest;
import com.web.study_analysis.study_business.progress.dto.ProgressResponse;
import com.web.study_analysis.study_business.progress.entity.Progress;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.tier.SubscriptionAccess;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProgressService {
    ProgressRepository progressRepository;
    UserRepository userRepository;
    LessonService lessonService;

    @Transactional
    public ProgressResponse upsert(ProgressRequest request) {
        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        var lesson = lessonService.getEntityById(request.getLessonId());
        SubscriptionAccess.requireLearnAccess(user, lesson.getCourse());
        Progress p = progressRepository.findByUser_IdAndLesson_Id(request.getUserId(), request.getLessonId())
                .orElse(Progress.builder().user(user).lesson(lesson).build());
        p.setCompleted(Boolean.TRUE.equals(request.getCompleted()));
        p.setCompletedAt(p.isCompleted() ? LocalDateTime.now() : null);
        return toResponse(progressRepository.save(p));
    }

    @Transactional(readOnly = true)
    public List<ProgressResponse> listForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOTFOUND);
        }
        return progressRepository.findByUser_Id(userId).stream().map(this::toResponse).toList();
    }

    private ProgressResponse toResponse(Progress p) {
        return ProgressResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .lessonId(p.getLesson().getId())
                .completed(p.isCompleted())
                .completedAt(p.getCompletedAt())
                .build();
    }
}
