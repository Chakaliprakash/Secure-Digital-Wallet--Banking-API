package com.securewallet.api.service;

import com.securewallet.api.domain.User;
import com.securewallet.api.domain.Wallet;
import com.securewallet.api.domain.enums.Role;
import com.securewallet.api.dto.request.LoginRequest;
import com.securewallet.api.dto.request.RegisterRequest;
import com.securewallet.api.dto.response.AuthResponse;
import com.securewallet.api.exception.UserAlreadyExistsException;
import com.securewallet.api.exception.UserNotFoundException;
import com.securewallet.api.repository.UserRepository;
import com.securewallet.api.repository.WalletRepository;
import com.securewallet.api.security.CustomUserDetails;
import com.securewallet.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UserAlreadyExistsException("Username is already taken: " + request.username());
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new UserAlreadyExistsException("Email is already registered: " + request.email());
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role() != null ? request.role() : Role.ROLE_USER)
                .build();

        BigDecimal initialBalance = request.initialDeposit() != null ? request.initialDeposit() : BigDecimal.ZERO;
        Wallet wallet = Wallet.builder()
                .balance(initialBalance)
                .currency("USD")
                .user(user)
                .build();

        user.setWallet(wallet);
        User savedUser = userRepository.save(user);

        CustomUserDetails userDetails = CustomUserDetails.build(savedUser);
        String token = tokenProvider.generateToken(userDetails);

        return AuthResponse.of(
                token,
                tokenProvider.getExpirationDuration(),
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.getWallet().getId()
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new UserNotFoundException("User not found: " + request.username()));

        Long walletId = user.getWallet() != null ? user.getWallet().getId() : null;

        return AuthResponse.of(
                token,
                tokenProvider.getExpirationDuration(),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                walletId
        );
    }
}
