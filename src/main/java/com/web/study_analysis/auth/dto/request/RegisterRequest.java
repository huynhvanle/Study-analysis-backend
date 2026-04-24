package com.web.study_analysis.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * Đăng ký công khai — không có trường role; server luôn tạo tài khoản STUDENT.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterRequest {

    /** Độ dài thực tế (sau strip) được kiểm tra trong service */
    @NotBlank(message = "INVALID_USERNAME")
    @Size(max = 50, message = "INVALID_USERNAME")
    String username;

    @NotBlank(message = "INVALID_PASSWORD")
    @Size(min = 8, max = 16, message = "INVALID_PASSWORD")
    String password;

    @Size(max = 255)
    String name;

    /** Tuỳ chọn; chuẩn hoá trong service */
    @Size(max = 255)
    String email;
}
