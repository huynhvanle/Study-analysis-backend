package com.web.study_analysis.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Trang gốc (sau context-path) chuyển tới index.html — tránh trình duyệt gọi API mà không khớp / tài nguyên tĩnh lỗi 500.
 */
@Controller
public class IndexPageController {

    @GetMapping("/")
    public String index() {
        return "forward:/index.html";
    }
}
