package com.web.study_analysis.study_business.course;

import java.text.Normalizer;
import java.util.Locale;

public final class CourseSlugHelper {
    private CourseSlugHelper() {}

    public static String slugify(String title) {
        if (title == null || title.isBlank()) {
            return "khoa-hoc";
        }
        String t = Normalizer.normalize(title.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        t = t.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return t.isEmpty() ? "khoa-hoc" : t;
    }
}
