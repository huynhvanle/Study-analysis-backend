package com.web.study_analysis.study_business.enrollment.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.entity.CourseStatus;
import com.web.study_analysis.study_business.course.service.CourseService;
import com.web.study_analysis.study_business.enrollment.dto.EnrollmentRequest;
import com.web.study_analysis.study_business.enrollment.dto.EnrollmentResponse;
import com.web.study_analysis.study_business.enrollment.entity.Enrollment;
import com.web.study_analysis.study_business.enrollment.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.tier.SubscriptionAccess;
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
public class EnrollmentService {
    EnrollmentRepository enrollmentRepository;
    UserRepository userRepository;
    CourseService courseService;

    @Transactional
    public EnrollmentResponse enroll(EnrollmentRequest request) {
        if (enrollmentRepository.existsByUser_IdAndCourse_Id(request.getUserId(), request.getCourseId())) {
            throw new AppException(ErrorCode.ALREADY_ENROLLED);
        }
        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        var course = courseService.getEntityById(request.getCourseId());
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new AppException(ErrorCode.COURSE_NOT_PUBLISHED);
        }
        SubscriptionAccess.requireLearnAccess(user, course);
        Enrollment e = Enrollment.builder().user(user).course(course).build();
        return toResponse(enrollmentRepository.save(e));
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> listForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOTFOUND);
        }
        return enrollmentRepository.findByUser_Id(userId).stream().map(this::toResponse).toList();
    }

    private EnrollmentResponse toResponse(Enrollment e) {
        return EnrollmentResponse.builder()
                .id(e.getId())
                .userId(e.getUser().getId())
                .courseId(e.getCourse().getId())
                .courseTitle(e.getCourse().getTitle())
                .enrolledAt(e.getEnrolledAt())
                .build();
    }
}
