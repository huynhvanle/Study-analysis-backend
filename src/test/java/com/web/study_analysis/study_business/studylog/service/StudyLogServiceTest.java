package com.web.study_analysis.study_business.studylog.service;

import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.lesson.entity.Lesson;
import com.web.study_analysis.study_business.lesson.service.LessonService;
import com.web.study_analysis.study_business.studylog.dto.StudyLogRequest;
import com.web.study_analysis.study_business.studylog.entity.StudyLog;
import com.web.study_analysis.study_business.studylog.repository.StudyLogRepository;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudyLogServiceTest {

    @Mock
    private StudyLogRepository studyLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LessonService lessonService;

    @InjectMocks
    private StudyLogService studyLogService;

    @Test
    void log_autoAssignsNextAttemptWhenRequestDoesNotProvideOne() {
        User user = User.builder()
                .id(7L)
                .username("student")
                .password("x")
                .role("STUDENT")
                .email("student@example.com")
                .build();
        Course course = Course.builder()
                .id(9L)
                .title("Khóa học thử nghiệm")
                .build();
        Lesson lesson = Lesson.builder()
                .id(11L)
                .course(course)
                .title("Bài 1")
                .duration(10)
                .orderIndex(1)
                .build();
        StudyLogRequest request = new StudyLogRequest();
        request.setUserId(7L);
        request.setLessonId(11L);
        request.setTimeSpent(18);
        request.setScore(82f);

        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(lessonService.getEntityById(11L)).thenReturn(lesson);
        when(studyLogRepository.countByUser_IdAndLesson_Id(7L, 11L)).thenReturn(2L);

        studyLogService.log(request);

        ArgumentCaptor<StudyLog> captor = ArgumentCaptor.forClass(StudyLog.class);
        verify(studyLogRepository).save(captor.capture());
        assertEquals(3, captor.getValue().getAttempt());
        assertEquals(18, captor.getValue().getTimeSpent());
        assertEquals(82f, captor.getValue().getScore());
    }
}
