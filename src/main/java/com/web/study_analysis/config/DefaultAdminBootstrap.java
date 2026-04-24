package com.web.study_analysis.config;

import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tạo tài khoản admin mặc định (admin / admin123) khi DB chưa có user nào có role ADMIN.
 * Đổi mật khẩu ngay sau lần đầu deploy production.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(10)
public class DefaultAdminBootstrap implements ApplicationRunner {

    private static final String ADMIN_ROLE = "ADMIN";
    private static final String DEFAULT_USERNAME = "admin";
    private static final String DEFAULT_PASSWORD = "admin123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(ADMIN_ROLE)) {
            log.debug("Skip default admin seed: at least one ADMIN already exists.");
            return;
        }
        if (userRepository.existsByUsername(DEFAULT_USERNAME)) {
            log.warn("Skip default admin seed: username '{}' already exists (not promoted here).", DEFAULT_USERNAME);
            return;
        }

        User admin = User.builder()
                .username(DEFAULT_USERNAME)
                .password(passwordEncoder.encode(DEFAULT_PASSWORD))
                .role(ADMIN_ROLE)
                .name("Administrator")
                .email(null)
                .build();

        userRepository.save(admin);
        log.warn(
                "Seeded default admin user (username={}, role={}). Change password before production.",
                DEFAULT_USERNAME,
                ADMIN_ROLE);
    }
}
