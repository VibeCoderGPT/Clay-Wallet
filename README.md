# 🧱🪙 Clay Wallet

<p align="center">
  <img src="web/icons/icon-192.png" width="96" alt="Clay Wallet icon" />
</p>

<p align="center">
  A soft, squishy <b>self-custody crypto wallet</b> with a hand-made clay look.<br/>
  Real 3D clay coins drift behind the app — all in <b>orange, beige &amp; mauve</b>.
</p>

<p align="center">
  <a href="https://github.com/VibeCoderGPT/Clay-Wallet/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-7a4f2f?style=flat-square" /></a>
  <img alt="Networks" src="https://img.shields.io/badge/7%20EVM%20chains-e8894e?style=flat-square" />
  <img alt="Self-custody" src="https://img.shields.io/badge/self--custody-f6c08f?style=flat-square" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA%20installable-b98ea6?style=flat-square" />
  <img alt="No build step" src="https://img.shields.io/badge/no%20build%20step-5a4230?style=flat-square" />
  <img alt="Three.js" src="https://img.shields.io/badge/three.js%203D-e8894e?style=flat-square" />
</p>

---

It's a **real wallet** (100 % client-side): it generates a BIP-39 recovery phrase,
derives your address, reads live balances from public RPCs, signs and broadcasts
real transactions, and swaps tokens through the **Uniswap V2 interface** (the
standard shared by Uniswap / SushiSwap / PancakeSwap) — on **Ethereum, Polygon,
Base, Arbitrum, Optimism, BNB Chain and Sepolia**.

## 🔒 Security model

Your keys are generated on your device and encrypted with a password
(WebCrypto **PBKDF2 + AES-GCM**) before being stored in `localStorage`. They
never leave your browser and are only held in memory while unlocked. Nothing is
sent to any server except normal RPC calls and CoinGecko price lookups.

> ⚠️ Still: always move test amounts first and never store more than you're
> willing to lose. Get an independent audit before using it for serious money.

## ▶️ Run it

```bash
python server.py              # opens http://127.0.0.1:8777
```

or double-click **`start.bat`** on Windows. No build step, no runtime
dependency — plain HTML/CSS/JS served by the Python standard library.

`python server.py --port 9000 --no-browser` picks a port and skips the browser.

## 🚀 Deploy it

The whole app is a static site in `web/`. Drag that folder onto **Cloudflare
Pages / Netlify / Vercel** and you're live in 5 minutes, HTTPS included. The
security headers are pre-wired (`web/_headers`, `netlify.toml`, `vercel.json`),
and `python build-zip.py` produces a deploy-ready zip.

Full step-by-step (custom domain, free RPC key, app stores): **[GO-LIVE.md](GO-LIVE.md)**.

## 🧭 What's inside

| File | What it does |
| --- | --- |
| `web/index.html` | App shell: gate (create/import/unlock), 6 screens, tab bar, sheet & toast |
| `web/style.css` | Claymorphism styling + the orange/beige/mauve palette |
| `web/app.js` | Wallet logic: vault, live balances, send/receive/swap/history, settings |
| `web/chains.js` | 7 EVM networks + curated ERC-20 tokens + public RPCs + swap routers |
| `web/vault.js` | Password-encrypted local storage (PBKDF2 + AES-GCM) |
| `web/background.js` | Ambient Three.js scene: 34 floating high-quality clay crypto coins |
| `web/vendor/*` | Vendored `ethers` v6, Three.js and `qrcode` (works offline) |
| `server.py` · `start.bat` | Local preview server + one-click Windows launcher |
| `build-single.py` | Inlines everything into one self-contained `Clay-Wallet.html` |
| `build-zip.py` | Regenerates the deploy-ready `clay-wallet-web.zip` |

## 🪙 Interact

- **Create** a 12/24-word wallet or **import** a recovery phrase / private key.
- **Unlock** with your password on each visit; 5 derived accounts in Settings.
- **Receive** shows a real scannable QR of your derived address.
- **Send** estimates the fee, then signs and broadcasts a real transaction.
- **Swap** gets live quotes via `getAmountsOut` and swaps through the chain's
  canonical V2 router (slippage 0.1 / 0.5 / 1 %).
- **History** lists every broadcast transaction with explorer links.
- **Settings**: reveal phrase, import custom ERC-20 tokens, lock, delete.

## 🔧 Regenerating the vendored libraries (optional)

`ethers`, Three.js and `qrcode` are already vendored, so the app works offline:

```bash
pnpm install
node node_modules/esbuild/bin/esbuild node_modules/ethers/lib.esm/index.js \
  --bundle --format=iife --global-name=ethers --platform=browser --minify --outfile=web/vendor/ethers.js
node node_modules/esbuild/bin/esbuild node_modules/qrcode/lib/browser.js \
  --bundle --format=iife --global-name=QRCodeLib --outfile=web/vendor/qrcode.js
Copy-Item node_modules/three/build/three.module.js web/vendor/three.module.js
Copy-Item node_modules/three/build/three.core.js web/vendor/three.core.js
```

## 📚 More

- **[GO-LIVE.md](GO-LIVE.md)** — launch checklist (hosting, domain, RPC keys, stores, audit)
- **[PROJECT-HISTORY.md](PROJECT-HISTORY.md)** — how this app came to be, step by step
- **[SECURITY.md](SECURITY.md)** — how to report a vulnerability

## 📄 License

[MIT](LICENSE) © VibeCoderGPT
