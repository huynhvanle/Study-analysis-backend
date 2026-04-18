package com.web.study_analysis.auth.controller;

import com.web.study_analysis.auth.dto.reponse.AuthenticationReponse;
import com.web.study_analysis.auth.dto.request.AuthenticationRequest;
import com.web.study_analysis.auth.service.AuthenticationService;
import com.web.study_analysis.exception.ApiReponse;
import com.web.study_analysis.user.dto.request.UserCreationRequest;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {

    AuthenticationService authenticationService;

    @PostMapping({"/login", "/log-in"})
    public ApiReponse<AuthenticationReponse> login(@Valid @RequestBody AuthenticationRequest request) {
        AuthenticationReponse body = authenticationService.login(request);
        return ApiReponse.<AuthenticationReponse>builder()
                .result(body)
                .build();
    }

    @PostMapping("/register")
    public ApiReponse<AuthenticationReponse> register(@Valid @RequestBody UserCreationRequest request) {
        AuthenticationReponse body = authenticationService.register(request);
        return ApiReponse.<AuthenticationReponse>builder()
                .result(body)
                .build();
    }
}
