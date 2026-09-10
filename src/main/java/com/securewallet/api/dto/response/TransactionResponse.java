package com.securewallet.api.dto.response;

import com.securewallet.api.domain.Transaction;
import com.securewallet.api.domain.enums.TransactionStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record TransactionResponse(
        Long id,
        Long senderWalletId,
        Long receiverWalletId,
        BigDecimal amount,
        TransactionStatus status,
        Instant timestamp,
        String failureReason
) {
    public static TransactionResponse fromEntity(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .senderWalletId(transaction.getSenderWalletId())
                .receiverWalletId(transaction.getReceiverWalletId())
                .amount(transaction.getAmount())
                .status(transaction.getStatus())
                .timestamp(transaction.getTimestamp())
                .failureReason(transaction.getFailureReason())
                .build();
    }
}
