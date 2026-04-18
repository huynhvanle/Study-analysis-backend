package com.web.study_analysis.user.mapper;

import com.web.study_analysis.user.dto.reponse.UserReponse;
import com.web.study_analysis.user.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserReponse toUserReponse(User user);
}
