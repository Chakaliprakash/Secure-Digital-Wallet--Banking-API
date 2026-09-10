package com.securewallet.api.controller;

import com.securewallet.api.dto.request.DepositRequest;
import com.securewallet.api.dto.request.WithdrawRequest;
import com.securewallet.api.dto.response.WalletResponse;
import com.securewallet.api.service.WalletService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Wallets")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/{id}")
    public ResponseEntity<WalletResponse> getWalletById(@PathVariable Long id) {
        WalletResponse response = walletService.getWalletById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<WalletResponse> getWalletByUserId(@PathVariable Long userId) {
        WalletResponse response = walletService.getWalletByUserId(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/balance")
    public ResponseEntity<Map<String, Object>> getBalance(@PathVariable Long id) {
        BigDecimal balance = walletService.getBalance(id);
        return ResponseEntity.ok(Map.of(
                "walletId", id,
                "balance", balance
        ));
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<WalletResponse> deposit(@PathVariable Long id,
                                                  @Valid @RequestBody DepositRequest request) {
        WalletResponse response = walletService.deposit(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<WalletResponse> withdraw(@PathVariable Long id,
                                                   @Valid @RequestBody WithdrawRequest request) {
        WalletResponse response = walletService.withdraw(id, request);
        return ResponseEntity.ok(response);
    }
}
