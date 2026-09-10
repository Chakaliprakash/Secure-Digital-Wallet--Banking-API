package com.securewallet.api.dto.response;

import com.securewallet.api.domain.BankAccount;
import lombok.Builder;

import java.time.Instant;

@Builder
public record BankAccountResponse(
        Long id,
        Long userId,
        String accountNumber,
        String bankName,
        Instant createdAt
) {
    public static BankAccountResponse fromEntity(BankAccount bankAccount) {
        String rawAccount = bankAccount.getAccountNumber();
        String masked = rawAccount.length() > 4
                ? "*".repeat(rawAccount.length() - 4) + rawAccount.substring(rawAccount.length() - 4)
                : rawAccount;

        return BankAccountResponse.builder()
                .id(bankAccount.getId())
                .userId(bankAccount.getUserId())
                .accountNumber(masked)
                .bankName(bankAccount.getBankName())
                .createdAt(bankAccount.getCreatedAt())
                .build();
    }
}
