package com.securewallet.api.service;

import com.securewallet.api.domain.BankAccount;
import com.securewallet.api.domain.User;
import com.securewallet.api.dto.request.BankAccountRequest;
import com.securewallet.api.dto.response.BankAccountResponse;
import com.securewallet.api.exception.BankAccountNotFoundException;
import com.securewallet.api.exception.UserNotFoundException;
import com.securewallet.api.repository.BankAccountRepository;
import com.securewallet.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BankAccountService {

    private final BankAccountRepository bankAccountRepository;
    private final UserRepository userRepository;

    @Transactional
    public BankAccountResponse linkBankAccount(Long userId, BankAccountRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));

        if (bankAccountRepository.existsByAccountNumber(request.accountNumber())) {
            throw new IllegalArgumentException("Account number already registered: " + request.accountNumber());
        }

        BankAccount bankAccount = BankAccount.builder()
                .accountNumber(request.accountNumber())
                .bankName(request.bankName())
                .user(user)
                .build();

        user.addBankAccount(bankAccount);
        BankAccount savedAccount = bankAccountRepository.save(bankAccount);

        return BankAccountResponse.fromEntity(savedAccount);
    }

    @Transactional(readOnly = true)
    public List<BankAccountResponse> getBankAccountsByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException("User not found with ID: " + userId);
        }
        return bankAccountRepository.findByUserId(userId).stream()
                .map(BankAccountResponse::fromEntity)
                .toList();
    }

    @Transactional
    public void deleteBankAccount(Long accountId, Long userId) {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BankAccountNotFoundException("Bank account not found with ID: " + accountId));

        if (!account.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized to delete this account");
        }

        bankAccountRepository.delete(account);
    }
}
