package com.web.study_analysis.study_business.course.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.dto.CourseCategoryRequest;
import com.web.study_analysis.study_business.course.dto.CourseCategoryResponse;
import com.web.study_analysis.study_business.course.entity.CourseCategory;
import com.web.study_analysis.study_business.course.repository.CourseCategoryRepository;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseCategoryService {

    CourseCategoryRepository courseCategoryRepository;
    CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<CourseCategoryResponse> listAll() {
        return courseCategoryRepository.findAllByOrderByIdAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CourseCategoryResponse create(CourseCategoryRequest request) {
        String name = request.getName().trim();
        if (courseCategoryRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(ErrorCode.CATEGORY_NAME_EXISTS);
        }
        CourseCategory c = CourseCategory.builder()
                .name(name)
                .build();
        return toResponse(courseCategoryRepository.save(c));
    }

    @Transactional
    public CourseCategoryResponse update(Long id, CourseCategoryRequest request) {
        CourseCategory c = courseCategoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        String name = request.getName().trim();
        if (courseCategoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new AppException(ErrorCode.CATEGORY_NAME_EXISTS);
        }
        c.setName(name);
        return toResponse(courseCategoryRepository.save(c));
    }

    @Transactional
    public void delete(Long id) {
        if (!courseCategoryRepository.existsById(id)) {
            throw new AppException(ErrorCode.CATEGORY_NOT_FOUND);
        }
        if (courseRepository.countByCategory_Id(id) > 0) {
            throw new AppException(ErrorCode.CATEGORY_HAS_COURSES);
        }
        courseCategoryRepository.deleteById(id);
    }

    private CourseCategoryResponse toResponse(CourseCategory c) {
        return CourseCategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .build();
    }
}
