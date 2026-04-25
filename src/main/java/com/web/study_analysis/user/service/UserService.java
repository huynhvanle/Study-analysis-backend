package com.web.study_analysis.user.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.user.dto.reponse.UserReponse;
import com.web.study_analysis.user.dto.request.UserCreationRequest;
import com.web.study_analysis.user.dto.request.UserUpdateRequest;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.mapper.UserMapper;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Service
public class UserService {
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[\\w+.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$");

    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    public UserReponse createUser(UserCreationRequest userCreationRequest) {
        if (userRepository.existsByUsername(userCreationRequest.getUsername())) {
            throw new AppException(ErrorCode.EXISTED_USER);
        }
        String email = normalizeEmail(userCreationRequest.getEmail());
        assertEmailValid(email);
        if (email != null && userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.EXISTED_EMAIL);
        }
        User user = User.builder()
                .username(userCreationRequest.getUsername())
                .password(passwordEncoder.encode(userCreationRequest.getPassword()))
                .role(userCreationRequest.getRole() != null && !userCreationRequest.getRole().isBlank()
                        ? userCreationRequest.getRole()
                        : "STUDENT")
                .name(userCreationRequest.getName())
                .email(email)
                .build();

        return userMapper.toUserReponse(userRepository.save(user));
    }

    public List<UserReponse> getAllUsers() {
        return userRepository.findAll().stream().map(userMapper::toUserReponse).toList();
    }

    public UserReponse getUserById(Long userId) {
        return userMapper.toUserReponse(userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND)));
    }

    public UserReponse updateUser(Long userId, UserUpdateRequest uRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));

        if (uRequest.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(uRequest.getPassword()));
        }
        if (uRequest.getRole() != null && !uRequest.getRole().isBlank()) {
            user.setRole(uRequest.getRole());
        }
        if (uRequest.getName() != null) {
            user.setName(uRequest.getName());
        }
        if (uRequest.getEmail() != null) {
            String email = normalizeEmail(uRequest.getEmail());
            assertEmailValid(email);
            if (email != null) {
                userRepository.findByEmail(email)
                        .filter(other -> !other.getId().equals(user.getId()))
                        .ifPresent(u -> {
                            throw new AppException(ErrorCode.EXISTED_EMAIL);
                        });
            }
            user.setEmail(email);
        }
        if (uRequest.getPlan() != null) {
            user.setPlan(uRequest.getPlan());
        }
        return userMapper.toUserReponse(userRepository.save(user));
    }

    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase();
    }

    private static void assertEmailValid(String email) {
        if (email == null) {
            return;
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new AppException(ErrorCode.INVALID_EMAIL);
        }
    }
}
