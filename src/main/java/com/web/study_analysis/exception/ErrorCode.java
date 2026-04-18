package com.web.study_analysis.exception;

public enum ErrorCode {
    EXISTED_USER(101,"The user already exists."),
    UNCATEGORIZE(999,"Uncategorized error"),
    INVALID_USERNAME(102,"Username must be at least 5 characters"),
    INVALID_PASSWORD(103, "Passwords must be at least 8 characters and no longer than 16 characters"),
    INVALID_ENUMKEY(1000,"Wrong key"),
    USER_NOTFOUND(104,"User not found"),
    UNAUTHENTICATED(105,"Wrong username or password"),
    COURSE_NOT_FOUND(106, "Course not found"),
    LESSON_NOT_FOUND(107, "Lesson not found"),
    QUIZ_NOT_FOUND(108, "Quiz not found"),
    ENROLLMENT_NOT_FOUND(109, "Enrollment not found"),
    ALREADY_ENROLLED(110, "User is already enrolled in this course"),
    EXISTED_EMAIL(111, "Email is already in use"),
    INVALID_EMAIL(112, "Email format is invalid"),
    JWT_SIGNING_FAILED(113, "Could not issue login token. Check server JWT configuration."),
    DUPLICATE_DATA(114, "That username or email is already registered.")
    ;

    private int code;
    private String messgage;

    ErrorCode(int code, String messgage) {
        this.code = code;
        this.messgage = messgage;
    }

    public int getCode() {
        return code;
    }

    public String getMessgage() {
        return messgage;
    }
}
