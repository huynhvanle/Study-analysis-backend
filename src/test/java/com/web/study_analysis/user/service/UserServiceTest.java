package com.web.study_analysis.user.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.user.dto.request.UserCreationRequest;
import com.web.study_analysis.user.dto.request.UserUpdateRequest;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.entity.UserStatus;
import com.web.study_analysis.user.dto.reponse.UserReponse;
import com.web.study_analysis.user.mapper.UserMapper;
import com.web.study_analysis.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void createUser_withoutEmail_rejectsRequest() {
        UserCreationRequest request = new UserCreationRequest();
        request.setUsername("student01");
        request.setPassword("password1");
        request.setEmail("   ");

        AppException exception = assertThrows(AppException.class, () -> userService.createUser(request));

        assertEquals(ErrorCode.EMAIL_REQUIRED, exception.getErrorCode());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateUser_blankEmail_rejectsRequest() {
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder()
                        .id(userId)
                        .username("student01")
                        .password("encoded")
                        .role("STUDENT")
                        .email("student01@example.com")
                        .build()
        ));

        UserUpdateRequest request = new UserUpdateRequest();
        request.setEmail("   ");

        AppException exception = assertThrows(AppException.class, () -> userService.updateUser(userId, request));

        assertEquals(ErrorCode.EMAIL_REQUIRED, exception.getErrorCode());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateUser_status_isPersisted() {
        Long userId = 2L;
        User user = User.builder()
                .id(userId)
                .username("student02")
                .password("encoded")
                .role("STUDENT")
                .email("student02@example.com")
                .status(UserStatus.ACTIVE)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toUserReponse(any(User.class))).thenReturn(UserReponse.builder().id(userId).build());

        UserUpdateRequest request = new UserUpdateRequest();
        request.setStatus(UserStatus.INACTIVE);

        userService.updateUser(userId, request);

        assertEquals(UserStatus.INACTIVE, user.getStatus());
        verify(userRepository).save(user);
    }

    @Test
    void requestPlusUpgrade_freeUser_marksRequest() {
        Long userId = 3L;
        User user = User.builder()
                .id(userId)
                .username("student03")
                .password("encoded")
                .role("STUDENT")
                .email("student03@example.com")
                .plusUpgradeRequested(false)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toUserReponse(any(User.class))).thenReturn(UserReponse.builder().id(userId).plusUpgradeRequested(true).build());

        userService.requestPlusUpgrade(userId);

        assertEquals(true, user.getPlusUpgradeRequested());
        verify(userRepository).save(user);
    }

    @Test
    void updateUser_planPlus_clearsPendingRequest() {
        Long userId = 4L;
        User user = User.builder()
                .id(userId)
                .username("student04")
                .password("encoded")
                .role("STUDENT")
                .email("student04@example.com")
                .plusUpgradeRequested(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toUserReponse(any(User.class))).thenReturn(UserReponse.builder().id(userId).build());

        UserUpdateRequest request = new UserUpdateRequest();
        request.setPlan(com.web.study_analysis.study_business.tier.SubscriptionTier.PLUS);

        userService.updateUser(userId, request);

        assertEquals(false, user.getPlusUpgradeRequested());
        verify(userRepository).save(user);
    }
}
