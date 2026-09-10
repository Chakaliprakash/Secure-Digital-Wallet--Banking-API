package com.securewallet.api.dto.response;

import com.securewallet.api.domain.Wallet;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record WalletResponse(
        Long id,
        Long userId,
        String username,
        BigDecimal balance,
        String currency,
        Instant createdAt,
        Instant updatedAt
) {
    public static WalletResponse fromEntity(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .userId(wallet.getUser() != null ? wallet.getUser().getId() : null)
                .username(wallet.getUser() != null ? wallet.getUser().getUsername() : null)
                .balance(wallet.getBalance())
                .currency(wallet.getCurrency())
                .createdAt(wallet.getCreatedAt())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }
}
