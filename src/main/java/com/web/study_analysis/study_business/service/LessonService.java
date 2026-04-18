package com.web.study_analysis.study_business.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.dto.LessonRequest;
import com.web.study_analysis.study_business.dto.LessonResponse;
import com.web.study_analysis.study_business.model.Lesson;
import com.web.study_analysis.study_business.repository.LessonRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonService {
    LessonRepository lessonRepository;
    CourseService courseService;

    @Transactional
    public LessonResponse create(Long courseId, LessonRequest request) {
        var course = courseService.getEntityById(courseId);
        Lesson lesson = Lesson.builder()
                .course(course)
                .title(request.getTitle())
                .contentUrl(request.getContentUrl())
                .duration(request.getDuration())
                .orderIndex(request.getOrderIndex())
                .build();
        return toResponse(lessonRepository.save(lesson));
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> listByCourse(Long courseId) {
        courseService.getEntityById(courseId);
        return lessonRepository.findByCourse_IdOrderByOrderIndexAsc(courseId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonResponse getById(Long lessonId) {
        return toResponse(lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND)));
    }

    @Transactional(readOnly = true)
    public LessonResponse getByCourseAndLesson(Long courseId, Long lessonId) {
        Lesson l = lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        if (!l.getCourse().getId().equals(courseId)) {
            throw new AppException(ErrorCode.LESSON_NOT_FOUND);
        }
        return toResponse(l);
    }

    public Lesson getEntityById(Long lessonId) {
        return lessonRepository.findById(lessonId).orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
    }

    private LessonResponse toResponse(Lesson l) {
        return LessonResponse.builder()
                .id(l.getId())
                .courseId(l.getCourse().getId())
                .title(l.getTitle())
                .contentUrl(l.getContentUrl())
                .duration(l.getDuration())
                .orderIndex(l.getOrderIndex())
                .build();
    }
}
