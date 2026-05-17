package com.web.study_analysis.user.service;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.tier.SubscriptionTier;
import com.web.study_analysis.user.dto.reponse.UserReponse;
import com.web.study_analysis.user.dto.request.UserCreationRequest;
import com.web.study_analysis.user.dto.request.UserUpdateRequest;
import com.web.study_analysis.user.entity.User;
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
    PasswordEncoder passwordEncoder;

    public UserReponse createUser(UserCreationRequest userCreationRequest) {
        if (userRepository.existsByUsername(userCreationRequest.getUsername())) {
            throw new AppException(ErrorCode.EXISTED_USER);
        }
        String email = normalizeEmail(userCreationRequest.getEmail());
        assertEmailPresent(email);
        assertEmailValid(email);
        if (userRepository.existsByEmail(email)) {
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

        return toUserReponse(userRepository.save(user));
    }

    public List<UserReponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::toUserReponse).toList();
    }

    public UserReponse getUserById(Long userId) {
        return toUserReponse(userRepository.findById(userId)
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
            assertEmailPresent(email);
            assertEmailValid(email);
            userRepository.findByEmail(email)
                    .filter(other -> !other.getId().equals(user.getId()))
                    .ifPresent(u -> {
                        throw new AppException(ErrorCode.EXISTED_EMAIL);
                    });
            user.setEmail(email);
        }
        if (uRequest.getPlan() != null) {
            user.setPlan(uRequest.getPlan());
            if (uRequest.getPlan() == SubscriptionTier.PLUS) {
                user.setPlusUpgradeRequested(false);
            }
        }
        if (uRequest.getStatus() != null) {
            user.setStatus(uRequest.getStatus());
        }
        if (uRequest.getPlusUpgradeRequested() != null) {
            user.setPlusUpgradeRequested(uRequest.getPlusUpgradeRequested());
        }
        return toUserReponse(userRepository.save(user));
    }

    public UserReponse requestPlusUpgrade(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        if (user.getPlan() == SubscriptionTier.PLUS) {
            user.setPlusUpgradeRequested(false);
            return toUserReponse(userRepository.save(user));
        }
        if (!Boolean.TRUE.equals(user.getPlusUpgradeRequested())) {
            user.setPlusUpgradeRequested(true);
            user = userRepository.save(user);
        }
        return toUserReponse(user);
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
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new AppException(ErrorCode.INVALID_EMAIL);
        }
    }

    private static void assertEmailPresent(String email) {
        if (email == null) {
            throw new AppException(ErrorCode.EMAIL_REQUIRED);
        }
    }

    private UserReponse toUserReponse(User user) {
        if (user == null) {
            return null;
        }
        return UserReponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .name(user.getName())
                .email(user.getEmail())
                .plan(user.getPlan())
                .status(user.getStatus())
                .plusUpgradeRequested(Boolean.TRUE.equals(user.getPlusUpgradeRequested()))
                .createdAt(user.getCreatedAt())
                .build();
    }
}
