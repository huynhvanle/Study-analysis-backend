package com.web.study_analysis.auth.service;

import com.web.study_analysis.auth.dto.request.AuthenticationRequest;
import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.entity.UserStatus;
import com.web.study_analysis.user.repository.UserRepository;
import com.web.study_analysis.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    void login_inactiveUser_rejectsAuthentication() {
        User user = User.builder()
                .id(10L)
                .username("student01")
                .password("encoded")
                .role("STUDENT")
                .email("student01@example.com")
                .status(UserStatus.INACTIVE)
                .build();
        when(userRepository.findByUsername("student01")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password1", "encoded")).thenReturn(true);

        AuthenticationRequest request = AuthenticationRequest.builder()
                .username("student01")
                .password("password1")
                .build();

        AppException exception = assertThrows(AppException.class, () -> authenticationService.login(request));

        assertEquals(ErrorCode.USER_INACTIVE, exception.getErrorCode());
    }
}
