package com.web.study_analysis.user.dto.reponse;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserReponse {
    private Long id;
    private String username;
    private String role;
    private String name;
    private String email;
    private LocalDateTime createdAt;
}
