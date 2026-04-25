package com.web.study_analysis.user.entity;

import com.web.study_analysis.study_business.tier.SubscriptionTier;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, unique = true, length = 50)
    String username;

    @Column(nullable = false, length = 255)
    String password;

    @Column(nullable = false, length = 25)
    String role;

    @Column(length = 255)
    String name;

    @Column(length = 255, unique = true)
    String email;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    /** Gói đăng ký: FREE mặc định; PLUS mới học khóa gắn Plus. */
    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_tier", length = 20, nullable = false)
    @Builder.Default
    SubscriptionTier plan = SubscriptionTier.FREE;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (role == null || role.isBlank()) {
            role = "STUDENT";
        }
        if (plan == null) {
            plan = SubscriptionTier.FREE;
        }
    }
}
