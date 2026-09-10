package com.securewallet.api.controller;

import com.securewallet.api.dto.request.BankAccountRequest;
import com.securewallet.api.dto.response.BankAccountResponse;
import com.securewallet.api.service.BankAccountService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bank-accounts")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Bank Accounts")
public class BankAccountController {

    private final BankAccountService bankAccountService;

    @PostMapping("/user/{userId}")
    public ResponseEntity<BankAccountResponse> linkBankAccount(
            @PathVariable Long userId,
            @Valid @RequestBody BankAccountRequest request) {
        BankAccountResponse response = bankAccountService.linkBankAccount(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BankAccountResponse>> getUserBankAccounts(@PathVariable Long userId) {
        List<BankAccountResponse> accounts = bankAccountService.getBankAccountsByUserId(userId);
        return ResponseEntity.ok(accounts);
    }

    @DeleteMapping("/{id}/user/{userId}")
    public ResponseEntity<Void> deleteBankAccount(
            @PathVariable Long id,
            @PathVariable Long userId) {
        bankAccountService.deleteBankAccount(id, userId);
        return ResponseEntity.noContent().build();
    }
}
