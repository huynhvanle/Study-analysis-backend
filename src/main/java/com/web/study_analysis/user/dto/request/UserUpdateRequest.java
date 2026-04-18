package com.web.study_analysis.user.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @Size(min = 8, max = 16, message = "INVALID_PASSWORD")
    private String password;

    private String role;

    private String name;

    /** Optional; set to blank to clear; validated when non-blank */
    private String email;
}
