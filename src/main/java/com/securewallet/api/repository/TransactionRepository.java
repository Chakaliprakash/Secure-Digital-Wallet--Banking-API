package com.securewallet.api.repository;

import com.securewallet.api.domain.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    @Query("SELECT t FROM Transaction t " +
           "WHERE t.senderWallet.id = :walletId OR t.receiverWallet.id = :walletId " +
           "ORDER BY t.timestamp DESC")
    Page<Transaction> findTransactionsByWalletId(@Param("walletId") Long walletId, Pageable pageable);

    @Query("SELECT t FROM Transaction t " +
           "WHERE t.senderWallet.id = :walletId OR t.receiverWallet.id = :walletId " +
           "ORDER BY t.timestamp DESC")
    List<Transaction> findAllTransactionsByWalletId(@Param("walletId") Long walletId);
}
