package com.web.study_analysis.auth.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSObject;
import com.nimbusds.jose.Payload;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.web.study_analysis.auth.dto.reponse.AuthenticationReponse;
import com.web.study_analysis.auth.dto.request.AuthenticationRequest;
import com.web.study_analysis.auth.dto.request.RegisterRequest;
import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.tier.SubscriptionTier;
import com.web.study_analysis.user.dto.request.UserCreationRequest;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import com.web.study_analysis.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.signer-key}")
    private String signerKey;

    /**
     * Đăng ký công khai: luôn tạo role STUDENT; bỏ qua mọi giá trị role nếu client gửi lẻ.
     */
    @Transactional
    public AuthenticationReponse register(RegisterRequest request) {
        String username = request.getUsername().strip();
        if (username.length() < 5 || username.length() > 50) {
            throw new AppException(ErrorCode.INVALID_USERNAME);
        }
        String name = request.getName();
        if (name != null) {
            name = name.trim();
            if (name.isEmpty()) {
                name = null;
            }
        }
        String email = request.getEmail();
        if (email != null) {
            email = email.trim();
            if (email.isEmpty()) {
                email = null;
            }
        }

        UserCreationRequest create = new UserCreationRequest();
        create.setUsername(username);
        create.setPassword(request.getPassword());
        create.setName(name);
        create.setEmail(email);
        create.setRole("STUDENT");

        var profile = userService.createUser(create);
        User user = userRepository.findById(profile.getId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOTFOUND));
        return toAuthResponse(user);
    }

    /**
     * Same error for unknown user and bad password to avoid username enumeration.
     */
    public AuthenticationReponse login(AuthenticationRequest authenticationRequest) {
        String username = authenticationRequest.getUsername().strip();
        if (username.length() < 5) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || !passwordEncoder.matches(authenticationRequest.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return toAuthResponse(user);
    }

    private AuthenticationReponse toAuthResponse(User user) {
        SubscriptionTier plan = user.getPlan() != null ? user.getPlan() : SubscriptionTier.FREE;
        return AuthenticationReponse.builder()
                .token(generateToken(user))
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .name(user.getName())
                .email(user.getEmail())
                .plan(plan)
                .build();
    }

    String generateToken(User user) {
        JWSHeader jwsHeader = new JWSHeader(JWSAlgorithm.HS512);

        SubscriptionTier plan = user.getPlan() != null ? user.getPlan() : SubscriptionTier.FREE;
        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(user.getUsername())
                .issuer("study-analysis")
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plus(1, ChronoUnit.HOURS)))
                .claim("uid", user.getId())
                .claim("role", user.getRole())
                .claim("plan", plan.name())
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(jwsHeader, payload);
        try {
            byte[] keyBytes = signerKey.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (keyBytes.length < 64) {
                log.warn("jwt.signer-key should be at least 64 bytes for HS512; got {} bytes", keyBytes.length);
            }
            jwsObject.sign(new MACSigner(keyBytes));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Cannot sign JWT (check jwt.signer-key is at least 64 bytes for HS512)", e);
            throw new AppException(ErrorCode.JWT_SIGNING_FAILED);
        }
    }
}
