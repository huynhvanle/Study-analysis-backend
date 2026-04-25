package com.web.study_analysis.auth.dto.reponse;

import com.web.study_analysis.study_business.tier.SubscriptionTier;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationReponse {
    String token;
    Long userId;
    String username;
    String role;
    String name;
    String email;
    /** FREE / PLUS */
    SubscriptionTier plan;
}
