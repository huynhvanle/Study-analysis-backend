package com.web.study_analysis.config;

import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.study_business.course.repository.CourseRepository;
import com.web.study_analysis.study_business.tier.SubscriptionTier;
import com.web.study_analysis.user.entity.User;
import com.web.study_analysis.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cột mới: gán FREE cho bản ghi cũ (null).
 */
@Component
@Order(46)
@RequiredArgsConstructor
@Slf4j
public class SubscriptionTierBackfill implements ApplicationRunner {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int u = 0;
        for (User user : userRepository.findAll()) {
            if (user.getPlan() == null) {
                user.setPlan(SubscriptionTier.FREE);
                userRepository.save(user);
                u++;
            }
        }
        if (u > 0) {
            log.info("Backfilled users.subscription_tier: {} row(s) -> FREE.", u);
        }
        int c = 0;
        for (Course course : courseRepository.findAll()) {
            if (course.getAccessTier() == null) {
                course.setAccessTier(SubscriptionTier.FREE);
                courseRepository.save(course);
                c++;
            }
        }
        if (c > 0) {
            log.info("Backfilled course.access_tier: {} row(s) -> FREE.", c);
        }
    }
}
