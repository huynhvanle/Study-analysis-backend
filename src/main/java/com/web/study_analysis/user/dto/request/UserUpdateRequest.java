package com.web.study_analysis.user.dto.request;

import com.web.study_analysis.study_business.tier.SubscriptionTier;
import com.web.study_analysis.user.entity.UserStatus;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @Size(min = 8, max = 16, message = "INVALID_PASSWORD")
    private String password;

    private String role;

    private String name;

    /** Optional to omit from update, but cannot be blank when provided. */
    private String email;

    /** Gói học viên: FREE hoặc PLUS (quản trị). */
    private SubscriptionTier plan;

    /** Trạng thái tài khoản: ACTIVE / INACTIVE (quản trị). */
    private UserStatus status;

    /** Đã gửi yêu cầu nâng cấp tài khoản Plus. */
    private Boolean plusUpgradeRequested;
}
