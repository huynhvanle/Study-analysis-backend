package com.web.study_analysis.user.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserCreationRequest {
    @Size(min = 5, message = "INVALID_USERNAME")
    private String username;

    @Size(min = 8, max = 16, message = "INVALID_PASSWORD")
    private String password;

    /** Defaults to STUDENT if omitted */
    private String role;

    private String name;

    /** Optional; normalized and validated when present */
    private String email;
}
