package com.web.study_analysis.study_business.tier;

import com.web.study_analysis.exception.AppException;
import com.web.study_analysis.exception.ErrorCode;
import com.web.study_analysis.study_business.course.entity.Course;
import com.web.study_analysis.user.entity.User;

public final class SubscriptionAccess {

    private SubscriptionAccess() {}

    public static boolean canAccessContent(User user, Course course) {
        if (user == null || course == null) {
            return false;
        }
        SubscriptionTier need = course.getAccessTier() != null ? course.getAccessTier() : SubscriptionTier.FREE;
        if (need == SubscriptionTier.FREE) {
            return true;
        }
        SubscriptionTier have = user.getPlan() != null ? user.getPlan() : SubscriptionTier.FREE;
        return have == SubscriptionTier.PLUS;
    }

    public static void requireLearnAccess(User user, Course course) {
        if (!canAccessContent(user, course)) {
            throw new AppException(ErrorCode.PLUS_SUBSCRIPTION_REQUIRED);
        }
    }
}
