package com.web.study_analysis.study_business.course.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.CourseSlugHelper;
import com.web.study_analysis.study_business.course.dto.CourseRequest;
import com.web.study_analysis.study_business.course.dto.CourseResponse;
import com.web.study_analysis.study_business.course.dto.CourseUpdateRequest;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.course.entity.CourseCategory;
import com.web.study_analysis.study_business.course.entity.CourseStatus;
import com.web.study_analysis.study_business.course.repository.CourseCategoryRepository;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import com.web.study_analysis.study_business.enrollment.repository.EnrollmentRepository;
import com.web.study_analysis.study_business.lesson.repository.LessonRepository;
import com.web.study_analysis.study_business.progress.repository.ProgressRepository;
import com.web.study_analysis.study_business.quiz.entity.Quiz;
import com.web.study_analysis.study_business.quiz.repository.QuizRepository;
import com.web.study_analysis.study_business.quiz.repository.QuizResultRepository;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseService {
    CourseRepository courseRepository;
    CourseCategoryRepository courseCategoryRepository;
    LessonRepository lessonRepository;
    EnrollmentRepository enrollmentRepository;
    ProgressRepository progressRepository;
    StudyLogRepository studyLogRepository;
    QuizRepository quizRepository;
    QuizResultRepository quizResultRepository;
    UserRepository userRepository;

    @Transactional
    public CourseResponse create(CourseRequest request) {
        var creator = userRepository.findById(request.getCreatedByUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        CourseCategory category = courseCategoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        CourseStatus status = request.getStatus() != null ? request.getStatus() : CourseStatus.PUBLISHED;
        String baseSlug = request.getSlug() != null && !request.getSlug().isBlank()
                ? CourseSlugHelper.slugify(request.getSlug())
                : CourseSlugHelper.slugify(request.getTitle());
        String slug = ensureUniqueSlug(baseSlug, null);

        Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(category)
                .level(request.getLevel())
                .coverImageUrl(request.getCoverImageUrl())
                .slug(slug)
                .status(status)
                .language(request.getLanguage())
                .tags(normalizeTags(request.getTags()))
                .createdBy(creator)
                .build();
        return toResponse(courseRepository.save(course));
    }

    @Transactional
    public CourseResponse update(Long courseId, CourseUpdateRequest request) {
        Course c = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        if (request.getTitle() != null) {
            c.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            c.setDescription(request.getDescription());
        }
        if (request.getCategoryId() != null) {
            CourseCategory cat = courseCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            c.setCategory(cat);
        }
        if (request.getLevel() != null) {
            c.setLevel(request.getLevel());
        }
        if (request.getCoverImageUrl() != null) {
            c.setCoverImageUrl(request.getCoverImageUrl());
        }
        if (request.getLanguage() != null) {
            c.setLanguage(request.getLanguage());
        }
        if (request.getTags() != null) {
            c.setTags(normalizeTags(request.getTags()));
        }
        if (request.getStatus() != null) {
            c.setStatus(request.getStatus());
        }
        if (request.getSlug() != null) {
            if (request.getSlug().isBlank()) {
                c.setSlug(ensureUniqueSlug(CourseSlugHelper.slugify(c.getTitle()), c.getId()));
            } else {
                String want = CourseSlugHelper.slugify(request.getSlug());
                if (!want.equals(c.getSlug()) && slugTakenByOther(want, c.getId())) {
                    throw new AppException(ErrorCode.COURSE_SLUG_CONFLICT);
                }
                c.setSlug(want);
            }
        }
        return toResponse(courseRepository.save(c));
    }

    /** Catalog công khai: chỉ khóa đã xuất bản. */
    @Transactional(readOnly = true)
    public List<CourseResponse> listPublishedCatalog() {
        return courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> listPublishedByCategoryId(Long categoryId) {
        return courseRepository.findByCategory_IdAndStatus(categoryId, CourseStatus.PUBLISHED).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> searchPublished(String q) {
        if (q == null || q.isBlank()) {
            return listPublishedCatalog();
        }
        return courseRepository.searchByKeywordAndStatus(q.trim(), CourseStatus.PUBLISHED).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Quản trị: mọi trạng thái (nháp, đã gỡ, …). */
    @Transactional(readOnly = true)
    public List<CourseResponse> listAllForManagement() {
        return courseRepository.findAll().stream().map(this::toResponse).toList();
    }

    /** Chi tiết cho học viên — chỉ PUBLISHED. */
    @Transactional(readOnly = true)
    public CourseResponse getPublishedById(Long id) {
        Course c = courseRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        if (c.getStatus() != CourseStatus.PUBLISHED) {
            throw new AppException(ErrorCode.COURSE_NOT_FOUND);
        }
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public CourseResponse getPublishedBySlug(String slug) {
        Course c = courseRepository.findBySlug(slug).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        if (c.getStatus() != CourseStatus.PUBLISHED) {
            throw new AppException(ErrorCode.COURSE_NOT_FOUND);
        }
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public CourseResponse getByIdForManagement(Long id) {
        return toResponse(courseRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND)));
    }

    public Course getEntityById(Long id) {
        return courseRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
    }

    /**
     * Xóa khóa học (quản trị): gỡ enrollment, kết quả quiz, tiến độ, nhật ký học, rồi lesson/quiz và khóa.
     */
    @Transactional
    public void deleteForManagement(Long courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new AppException(ErrorCode.COURSE_NOT_FOUND);
        }
        List<Long> lessonIds = lessonRepository.findByCourse_IdOrderByOrderIndexAsc(courseId).stream()
                .map(Lesson::getId)
                .toList();
        if (!lessonIds.isEmpty()) {
            List<Long> quizIds = quizRepository.findByLesson_IdIn(lessonIds).stream()
                    .map(Quiz::getId)
                    .collect(Collectors.toList());
            if (!quizIds.isEmpty()) {
                quizResultRepository.deleteByQuiz_IdIn(quizIds);
            }
            progressRepository.deleteByLesson_IdIn(lessonIds);
            studyLogRepository.deleteByLesson_IdIn(lessonIds);
        }
        enrollmentRepository.deleteByCourse_Id(courseId);
        courseRepository.deleteById(courseId);
    }

    private CourseResponse toResponse(Course c) {
        long lessons = lessonRepository.countByCourse_Id(c.getId());
        Long sumMin = lessonRepository.sumDurationMinutesByCourseId(c.getId());
        int minutes = sumMin == null ? 0 : Math.min(Integer.MAX_VALUE, sumMin.intValue());
        Long catId = c.getCategory() != null ? c.getCategory().getId() : null;
        String catName = c.getCategory() != null ? c.getCategory().getName() : null;
        return CourseResponse.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .categoryId(catId)
                .category(catName)
                .level(c.getLevel())
                .coverImageUrl(c.getCoverImageUrl())
                .slug(c.getSlug())
                .status(c.getStatus())
                .publishedAt(c.getPublishedAt())
                .language(c.getLanguage())
                .tags(c.getTags())
                .createdByUserId(c.getCreatedBy().getId())
                .createdAt(c.getCreatedAt())
                .lessonCount(lessons)
                .totalDurationMinutes(minutes)
                .build();
    }

    private String ensureUniqueSlug(String base, Long ignoreCourseId) {
        String candidate = base;
        for (int i = 0; i < 500; i++) {
            var existing = courseRepository.findBySlug(candidate);
            if (existing.isEmpty()) {
                return candidate;
            }
            if (ignoreCourseId != null && existing.get().getId().equals(ignoreCourseId)) {
                return candidate;
            }
            candidate = base + "-" + (i + 2);
        }
        throw new AppException(ErrorCode.COURSE_SLUG_CONFLICT);
    }

    private boolean slugTakenByOther(String slug, Long courseId) {
        return courseRepository.findBySlug(slug)
                .map(other -> !other.getId().equals(courseId))
                .orElse(false);
    }

    private static String normalizeTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return null;
        }
        return tags.trim();
    }
}
