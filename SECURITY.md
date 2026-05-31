# Security Policy

## Supported Versions

Turena is currently in active development. Only the `main` branch (v2.x) receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in the Turena codebase (including the smart contracts on Mantle, the Next.js frontend, or the FastAPI backend), please do **NOT** report it by creating a public GitHub issue.

Instead, please send an email to **edycutjong@gmail.com** or send a direct message via Discord. 

We will respond within 48 hours to coordinate a fix and safe disclosure. 

### Scope
- **Smart Contracts (`contracts/`)**: Vulnerabilities related to the `PredictionRegistry`, `TuringAgent8004`, or betting escrow logic.
- **Backend (`backend/`)**: Issues related to API keys leakage, injection attacks, or unauthorized cycle triggering.
- **Frontend (`src/`)**: XSS, CSRF, or sensitive data exposure on the Next.js client.
