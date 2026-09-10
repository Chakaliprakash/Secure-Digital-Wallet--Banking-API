package com.securewallet.api.service;

import com.securewallet.api.domain.Transaction;
import com.securewallet.api.domain.Wallet;
import com.securewallet.api.domain.enums.TransactionStatus;
import com.securewallet.api.dto.request.TransferRequest;
import com.securewallet.api.dto.response.TransactionResponse;
import com.securewallet.api.exception.InsufficientBalanceException;
import com.securewallet.api.exception.SelfTransferException;
import com.securewallet.api.exception.TransferSimulationException;
import com.securewallet.api.repository.TransactionRepository;
import com.securewallet.api.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransactionService transactionService;

    private Wallet senderWallet;
    private Wallet receiverWallet;

    @BeforeEach
    void setUp() {
        senderWallet = Wallet.builder()
                .id(1L)
                .balance(new BigDecimal("500.00"))
                .currency("USD")
                .build();

        receiverWallet = Wallet.builder()
                .id(2L)
                .balance(new BigDecimal("100.00"))
                .currency("USD")
                .build();
    }

    @Test
    void testTransferFunds_Success() {
        TransferRequest request = new TransferRequest(1L, 2L, new BigDecimal("150.00"), "Payment", false);

        when(walletRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(receiverWallet));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction t = invocation.getArgument(0);
            t.setId(101L);
            return t;
        });

        TransactionResponse response = transactionService.transferFunds(request);

        assertNotNull(response);
        assertEquals(TransactionStatus.SUCCESS, response.status());
        assertEquals(new BigDecimal("150.00"), response.amount());
        assertEquals(new BigDecimal("350.00"), senderWallet.getBalance());
        assertEquals(new BigDecimal("250.00"), receiverWallet.getBalance());

        verify(walletRepository, times(1)).save(senderWallet);
        verify(walletRepository, times(1)).save(receiverWallet);
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    void testTransferFunds_SelfTransferRejected() {
        TransferRequest request = new TransferRequest(1L, 1L, new BigDecimal("50.00"), "Self", false);

        assertThrows(SelfTransferException.class, () -> transactionService.transferFunds(request));

        verifyNoInteractions(walletRepository);
        verifyNoInteractions(transactionRepository);
    }

    @Test
    void testTransferFunds_InsufficientBalance() {
        TransferRequest request = new TransferRequest(1L, 2L, new BigDecimal("1000.00"), "Too high", false);

        when(walletRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(receiverWallet));

        assertThrows(InsufficientBalanceException.class, () -> transactionService.transferFunds(request));

        assertEquals(new BigDecimal("500.00"), senderWallet.getBalance());
        assertEquals(new BigDecimal("100.00"), receiverWallet.getBalance());
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void testTransferFunds_RollbackSimulation() {
        TransferRequest request = new TransferRequest(1L, 2L, new BigDecimal("50.00"), "Failure test", true);

        when(walletRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(receiverWallet));

        assertThrows(TransferSimulationException.class, () -> transactionService.transferFunds(request));

        assertEquals(new BigDecimal("100.00"), receiverWallet.getBalance());
        verify(transactionRepository, never()).save(any(Transaction.class));
    }
}
