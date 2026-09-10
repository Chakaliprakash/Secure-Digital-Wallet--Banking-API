package com.securewallet.api.dto.request;

import com.securewallet.api.domain.enums.Role;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RegisterRequest(
        @NotBlank(message = "Username is mandatory")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @NotBlank(message = "Email is mandatory")
        @Email(message = "Email must be valid")
        String email,

        @NotBlank(message = "Password is mandatory")
        @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
        String password,

        @DecimalMin(value = "0.0", inclusive = true, message = "Initial deposit cannot be negative")
        BigDecimal initialDeposit,

        Role role
) {
    public RegisterRequest {
        if (initialDeposit == null) {
            initialDeposit = BigDecimal.ZERO;
        }
        if (role == null) {
            role = Role.ROLE_USER;
        }
    }
}
