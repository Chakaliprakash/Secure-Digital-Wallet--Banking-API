package com.securewallet.api.service;

import com.securewallet.api.domain.Transaction;
import com.securewallet.api.domain.Wallet;
import com.securewallet.api.domain.enums.TransactionStatus;
import com.securewallet.api.dto.request.DepositRequest;
import com.securewallet.api.dto.request.WithdrawRequest;
import com.securewallet.api.dto.response.WalletResponse;
import com.securewallet.api.exception.InsufficientBalanceException;
import com.securewallet.api.exception.WalletNotFoundException;
import com.securewallet.api.repository.TransactionRepository;
import com.securewallet.api.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public WalletResponse getWalletById(Long walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found with ID: " + walletId));
        return WalletResponse.fromEntity(wallet);
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found for user ID: " + userId));
        return WalletResponse.fromEntity(wallet);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public WalletResponse deposit(Long walletId, DepositRequest request) {
        Wallet wallet = walletRepository.findByIdForUpdate(walletId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found with ID: " + walletId));

        wallet.credit(request.amount());
        Wallet savedWallet = walletRepository.save(wallet);

        Transaction transaction = Transaction.builder()
                .senderWallet(null)
                .receiverWallet(savedWallet)
                .amount(request.amount())
                .status(TransactionStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();
        transactionRepository.save(transaction);

        return WalletResponse.fromEntity(savedWallet);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public WalletResponse withdraw(Long walletId, WithdrawRequest request) {
        Wallet wallet = walletRepository.findByIdForUpdate(walletId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found with ID: " + walletId));

        if (!wallet.hasSufficientBalance(request.amount())) {
            throw new InsufficientBalanceException(
                    String.format("Insufficient funds in wallet %d. Available: %s, Requested: %s",
                            walletId, wallet.getBalance(), request.amount()));
        }

        wallet.debit(request.amount());
        Wallet savedWallet = walletRepository.save(wallet);

        Transaction transaction = Transaction.builder()
                .senderWallet(savedWallet)
                .receiverWallet(null)
                .amount(request.amount())
                .status(TransactionStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();
        transactionRepository.save(transaction);

        return WalletResponse.fromEntity(savedWallet);
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(Long walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found with ID: " + walletId));
        return wallet.getBalance();
    }
}
