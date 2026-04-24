package com.web.study_analysis.exception;

public enum ErrorCode {
    EXISTED_USER(101, "Tên đăng nhập đã được sử dụng."),
    UNCATEGORIZE(999, "Lỗi hệ thống chưa xử lý được."),
    INVALID_USERNAME(102, "Tên đăng nhập cần từ 5 đến 50 ký tự."),
    INVALID_PASSWORD(103, "Mật khẩu cần từ 8 đến 16 ký tự."),
    INVALID_ENUMKEY(1000, "Dữ liệu gửi lên không hợp lệ."),
    USER_NOTFOUND(104, "Không tìm thấy người dùng."),
    UNAUTHENTICATED(105, "Sai tên đăng nhập hoặc mật khẩu."),
    COURSE_NOT_FOUND(106, "Không tìm thấy khóa học."),
    LESSON_NOT_FOUND(107, "Không tìm thấy bài học."),
    QUIZ_NOT_FOUND(108, "Không tìm thấy bài kiểm tra."),
    QUIZ_QUESTION_NOT_FOUND(120, "Không tìm thấy câu hỏi."),
    QUIZ_OPTION_NOT_FOUND(121, "Không tìm thấy đáp án."),
    QUIZ_QUESTION_INVALID(122, "Câu hỏi không hợp lệ."),
    ENROLLMENT_NOT_FOUND(109, "Không tìm thấy ghi danh."),
    ALREADY_ENROLLED(110, "Bạn đã ghi danh khóa học này."),
    EXISTED_EMAIL(111, "Email đã được sử dụng."),
    INVALID_EMAIL(112, "Email không đúng định dạng."),
    JWT_SIGNING_FAILED(113, "Không tạo được token đăng nhập. Kiểm tra cấu hình JWT trên server."),
    DUPLICATE_DATA(114, "Tên đăng nhập hoặc email đã tồn tại."),
    COURSE_NOT_PUBLISHED(115, "Khóa học chưa xuất bản hoặc không còn mở ghi danh."),
    COURSE_SLUG_CONFLICT(116, "Đường dẫn (slug) khóa học đã được dùng."),
    CATEGORY_NOT_FOUND(117, "Không tìm thấy danh mục."),
    CATEGORY_NAME_EXISTS(118, "Tên danh mục đã tồn tại."),
    CATEGORY_HAS_COURSES(119, "Không xoá được: vẫn còn khóa học thuộc danh mục này.")
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
