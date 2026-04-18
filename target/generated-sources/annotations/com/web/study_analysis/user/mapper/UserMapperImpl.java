package com.web.study_analysis.user.mapper;

import com.web.study_analysis.user.dto.reponse.UserReponse;
import com.web.study_analysis.user.entity.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-18T10:14:44+0700",
    comments = "version: 1.6.3, compiler: javac, environment: Java 17.0.18 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserReponse toUserReponse(User user) {
        if ( user == null ) {
            return null;
        }

        UserReponse.UserReponseBuilder userReponse = UserReponse.builder();

        userReponse.id( user.getId() );
        userReponse.username( user.getUsername() );
        userReponse.role( user.getRole() );
        userReponse.name( user.getName() );
        userReponse.email( user.getEmail() );
        userReponse.createdAt( user.getCreatedAt() );

        return userReponse.build();
    }
}
