package com.securewallet.api.dto.response;

import com.securewallet.api.domain.enums.Role;
import lombok.Builder;

@Builder
public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        Long userId,
        String username,
        String email,
        Role role,
        Long walletId
) {
    public static AuthResponse of(String accessToken, long expiresIn, Long userId, String username, String email, Role role, Long walletId) {
        return new AuthResponse(accessToken, "Bearer", expiresIn, userId, username, email, role, walletId);
    }
}
