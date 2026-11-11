# Security Policy

## Reporting a vulnerability

If you find a security issue — especially anything touching key generation,
encryption at rest (`vault.js`), signing/broadcast (`app.js`), or the swap path —
please report it **privately** instead of opening a public issue:

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability** (private vulnerability reporting).
3. Describe the issue, the affected code, and a proof of concept if you have one.

You'll get an acknowledgement as soon as possible. Please give a reasonable
amount of time for a fix before disclosing publicly.

## Scope

- `web/vault.js` — PBKDF2 + AES-GCM encryption of the recovery phrase
- `web/app.js` — key handling, transaction signing and broadcasting
- `web/chains.js` — RPC endpoints and swap router addresses
- `web/sw.js` — service worker caching

Out of scope: the cosmetic/3D layer (`web/background.js`, `web/style.css`).

## Known limitations (read this before real money)

- Keys are protected by a password-derived key held in browser memory while
  unlocked, and encrypted in `localStorage`. This is fine for a demo; for a
  production wallet, prefer hardware wallets / OS keychains (Secure Enclave,
  Android Keystore).
- Free public RPCs can be rate-limited or unavailable; pin your own RPC key
  (see `GO-LIVE.md`).
- This project has **not** been independently audited yet.
