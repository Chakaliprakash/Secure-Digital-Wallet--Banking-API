package com.securewallet.api.repository;

import com.securewallet.api.domain.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {

    @org.springframework.data.jpa.repository.Query("SELECT b FROM BankAccount b WHERE b.user.id = :userId")
    List<BankAccount> findByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);

    Optional<BankAccount> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);
}

