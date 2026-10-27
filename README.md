<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&height=195&color=0:0f172a,50:1d4ed8,100:38bdf8&text=Secure%20Digital%20Wallet&fontColor=ffffff&fontSize=40&fontAlignY=40&desc=Transactional%20Banking%20API%20%7C%20Fintech%20Dashboard&descAlignY=64&descSize=15" width="100%" alt="Secure Digital Wallet banner"/>

![Security](https://img.shields.io/badge/Security-JWT%20%26%20Spring%20Security-6DB33F?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge)

[Repository](https://github.com/Chakaliprakash/Secure-Digital-Wallet--Banking-API) · [Issues](https://github.com/Chakaliprakash/Secure-Digital-Wallet--Banking-API/issues)

</div>

---

# Secure Digital Wallet API

A Spring Boot application that models digital-wallet and banking operations through REST APIs.

## Features

- User registration and authentication with JWT.
- Wallet and balance retrieval.
- Deposit and withdrawal operations.
- Bank account and transaction endpoints.
- Request validation and centralized exception handling.
- OpenAPI documentation through Springdoc.

## Technology Stack

- Java 21 and Spring Boot 3
- Spring Security and JWT
- Spring Data JPA and PostgreSQL
- H2 for the development profile
- Maven and Docker Compose

## Run Locally

### Option 1: Development profile

The repository includes an H2 in-memory configuration.

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Option 2: PostgreSQL

Configure the PostgreSQL connection in `src/main/resources/application.properties`, then start the application with the default profile.

## API Documentation

When the application is running, open:

`http://localhost:8080/swagger-ui.html`

The wallet endpoints are under `/api/v1/wallets`. Review the controller classes for the complete endpoint list.

## Security

Use environment-specific secrets and database credentials. Do not use committed sample credentials or signing keys in a deployed environment.

## Author

[Prakash Chakali](https://github.com/Chakaliprakash)
