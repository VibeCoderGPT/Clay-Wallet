# Clay Wallet — Go Live Guide 🚀

The whole app is a **static site** (plain HTML/CSS/JS in the `web/` folder — no
backend, no build step). That means hosting it is drag-and-drop. Everything below
is free except the custom domain (~10–15 €/yr).

---

## 1. Deploy for free (no money, 5 minutes)

### Option A — Cloudflare Pages (recommended)
1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**.
2. **Upload assets** → drag the **`web/`** folder in (or import this GitHub repo).
3. Project name: `clay-wallet` → **Deploy**.
4. You instantly get `https://clay-wallet.pages.dev` with HTTPS. ✅

### Option B — Netlify
1. https://app.netlify.com/drop → drag the **`web/`** folder (or the repo).
2. Done: `https://<name>.netlify.app`. The `netlify.toml` already sets the publish
   directory and security headers.

### Option C — Vercel
1. https://vercel.com/new → import the repo.
2. Deploy as-is: `vercel.json` already routes `web/` to the site root and adds the
   security headers. URL: `https://<name>.vercel.app`.

All three also serve the deploy-ready zip: regenerate it with
`python build-zip.py` or just upload the `web/` folder directly.

---

## 2. Custom domain (the only mandatory cost)

1. Buy at **Cloudflare Registrar** (at cost, ~10–15 €/yr for a .com/.xyz/.io).
2. Cloudflare Pages → your project → **Custom domains** → add it → DNS configures
   itself.
3. HTTPS is automatic. A real domain is required to look trustworthy for a wallet
   (and recommended — a `*.pages.dev` URL is fine for testing, less for users).

---

## 3. Free RPC key (recommended before real users)

The app uses public/free RPCs (publicnode, llamarpc, ankr…) with automatic
fallback, which can be rate-limited under load.

1. Create a free account at https://www.alchemy.com (or infura.io).
2. Copy your `https://eth-mainnet.g.alchemy.com/v2/KEY` URL.
3. In `web/chains.js`, paste it as the **first** entry of the network's `rpcs`
   array (one key per chain you care about; the free tier covers several).

---

## 4. Native app stores (later, real costs)

| Store | Cost | Notes |
| --- | --- | --- |
| Apple App Store | 99 $/yr | Wrap with Capacitor first |
| Google Play | 25 $ one-time | Same wrap |

Steps when you're ready:
1. `npx cap init "Clay Wallet" com.claywallet.app` + `npx cap add ios android`
   (Capacitor reuses the existing `web/` app as-is).
2. **Move key storage** to the platform keychain — iOS Secure Enclave / Android
   Keystore + biometric unlock — instead of the current `localStorage` password
   vault. This is required before app-store submission for a wallet.
3. Build with Xcode / Android Studio and submit.

---

## 5. Before promoting a mainnet wallet (responsible gate)

- **Security audit** of the key-handling and signing path by an external firm.
  Non-negotiable before you advertise real-money use.
- **Privacy policy + Terms of Service** (self-custody is lighter than an exchange,
  but any on-ramp/"Buy" links add obligations).
- Error tracking (Sentry) and a support channel (email/Discord).
- Test everything on **Sepolia** first (faucet link is in the app).

---

## Quick checklist after deploying

- [ ] Site loads over **https** (padlock icon)
- [ ] **Create wallet** → Sepolia → faucet → small **real send** works
- [ ] **Swap** page loads and quotes on a chain with V2 liquidity
- [ ] On mobile: "Add to Home Screen" → app installs (PWA) and reopens offline
- [ ] Security headers present (check with https://securityheaders.com)
