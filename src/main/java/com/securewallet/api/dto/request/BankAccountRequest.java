package com.securewallet.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BankAccountRequest(
        @NotBlank(message = "Account number is required")
        @Size(min = 6, max = 50, message = "Account number must be between 6 and 50 characters")
        String accountNumber,

        @NotBlank(message = "Bank name is required")
        @Size(min = 2, max = 100, message = "Bank name must be between 2 and 100 characters")
        String bankName
) {}
