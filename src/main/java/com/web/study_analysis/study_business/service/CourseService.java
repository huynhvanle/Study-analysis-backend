package com.web.study_analysis.study_business.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.dto.CourseRequest;
import com.web.study_analysis.study_business.dto.CourseResponse;
import com.web.study_analysis.study_business.model.Course;
import com.web.study_analysis.study_business.repository.CourseRepository;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseService {
    CourseRepository courseRepository;
    UserRepository userRepository;

    @Transactional
    public CourseResponse create(CourseRequest request) {
        var creator = userRepository.findById(request.getCreatedByUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .level(request.getLevel())
                .createdBy(creator)
                .build();
        return toResponse(courseRepository.save(course));
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> listAll() {
        return courseRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> listByCategory(String category) {
        return courseRepository.findByCategoryIgnoreCase(category).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CourseResponse getById(Long id) {
        return toResponse(courseRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND)));
    }

    public Course getEntityById(Long id) {
        return courseRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
    }

    private CourseResponse toResponse(Course c) {
        return CourseResponse.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .category(c.getCategory())
                .level(c.getLevel())
                .createdByUserId(c.getCreatedBy().getId())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
