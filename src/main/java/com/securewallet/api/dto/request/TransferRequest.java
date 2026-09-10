package com.securewallet.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TransferRequest(
        @NotNull(message = "Sender wallet ID is required")
        Long senderWalletId,

        @NotNull(message = "Receiver wallet ID is required")
        Long receiverWalletId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Transfer amount must be at least 0.01")
        BigDecimal amount,

        String description,

        Boolean simulateFailure
) {
    public TransferRequest {
        if (simulateFailure == null) {
            simulateFailure = false;
        }
    }
}
