package com.securewallet.api.service;

import com.securewallet.api.domain.Transaction;
import com.securewallet.api.domain.Wallet;
import com.securewallet.api.domain.enums.TransactionStatus;
import com.securewallet.api.dto.request.TransferRequest;
import com.securewallet.api.dto.response.TransactionResponse;
import com.securewallet.api.exception.InsufficientBalanceException;
import com.securewallet.api.exception.SelfTransferException;
import com.securewallet.api.exception.TransferSimulationException;
import com.securewallet.api.exception.WalletNotFoundException;
import com.securewallet.api.repository.TransactionRepository;
import com.securewallet.api.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public TransactionResponse transferFunds(TransferRequest request) {
        Long senderId = request.senderWalletId();
        Long receiverId = request.receiverWalletId();

        if (senderId.equals(receiverId)) {
            throw new SelfTransferException("Sender and receiver wallet IDs cannot be the same");
        }

        Long firstLockId = Math.min(senderId, receiverId);
        Long secondLockId = Math.max(senderId, receiverId);

        Wallet firstLockedWallet = walletRepository.findByIdForUpdate(firstLockId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found with ID: " + firstLockId));
        Wallet secondLockedWallet = walletRepository.findByIdForUpdate(secondLockId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found with ID: " + secondLockId));

        Wallet senderWallet = firstLockedWallet.getId().equals(senderId) ? firstLockedWallet : secondLockedWallet;
        Wallet receiverWallet = firstLockedWallet.getId().equals(receiverId) ? firstLockedWallet : secondLockedWallet;

        if (!senderWallet.hasSufficientBalance(request.amount())) {
            throw new InsufficientBalanceException(
                    String.format("Insufficient funds in wallet %d. Available: %s, Required: %s",
                            senderId, senderWallet.getBalance(), request.amount()));
        }

        senderWallet.debit(request.amount());
        walletRepository.save(senderWallet);

        if (Boolean.TRUE.equals(request.simulateFailure())) {
            log.warn("Simulated failure requested during transfer from wallet {}", senderId);
            throw new TransferSimulationException("Simulated transaction failure. Changes will be rolled back.");
        }

        receiverWallet.credit(request.amount());
        walletRepository.save(receiverWallet);

        Transaction transaction = Transaction.builder()
                .senderWallet(senderWallet)
                .receiverWallet(receiverWallet)
                .amount(request.amount())
                .status(TransactionStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();

        Transaction savedTransaction = transactionRepository.save(transaction);
        log.info("Transfer completed. Tx ID: {}", savedTransaction.getId());

        return TransactionResponse.fromEntity(savedTransaction);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionsForWallet(Long walletId, Pageable pageable) {
        if (!walletRepository.existsById(walletId)) {
            throw new WalletNotFoundException("Wallet not found with ID: " + walletId);
        }
        return transactionRepository.findTransactionsByWalletId(walletId, pageable)
                .map(TransactionResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(Long transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + transactionId));
        return TransactionResponse.fromEntity(transaction);
    }
}
