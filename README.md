# Clay Wallet 🧱🪙

A soft, squishy **self-custody crypto wallet** inspired by Trust Wallet, with a
hand-made **clay + couch-fabric** look. Real-time 3D is rendered with **Three.js**:
a background world of floating **clay crypto coins** drifting behind the app — all
in **orange, beige and mauve**.

It's a **real wallet** (client-side): it generates a BIP-39 recovery phrase,
derives your Ethereum address, reads live balances from public RPCs, and signs and
broadcasts real transactions on **Ethereum, Polygon, Base, Arbitrum, Optimism, BNB
Chain and Sepolia testnet**.

> **Security model.** Your keys are generated on this device and encrypted with a
> password (WebCrypto PBKDF2 + AES-GCM) before being stored in `localStorage`. They
> never leave your browser and are only ever held in memory while unlocked. Nothing
> is sent to any server except normal RPC calls and CoinGecko price lookups.
> Still, this is a self-contained demo build — always move test amounts first and
> never store more than you're willing to lose.

## Run it

```
python server.py            # opens http://127.0.0.1:8777
```

or double-click **`start.bat`** on Windows. There is no build step and no runtime
dependency — the app is plain HTML/CSS/JS and serves `web/` with the Python
standard library only.

`python server.py --port 9000 --no-browser` lets you pick a port and skip the
browser.

## What's inside

| File | What it does |
| --- | --- |
| `web/index.html` | App shell: gate (create/import/unlock), screens, tab bar, sheet & toast |
| `web/style.css` | Claymorphism styling + the orange/beige/mauve palette |
| `web/app.js` | Wallet logic: vault, live balances, send/receive/history, settings |
| `web/chains.js` | EVM networks + curated ERC-20 tokens + public RPCs |
| `web/vault.js` | Password-encrypted local storage (PBKDF2 + AES-GCM) |
| `web/background.js` | Ambient 3D scene: floating high-quality clay crypto coins |
| `web/vendor/ethers.js` | Vendored `ethers` v6 (bundled with esbuild) |
| `web/vendor/three.module.js` | Vendored Three.js (no network needed) |
| `web/vendor/three.core.js` | Vendored Three.js core (required by `three.module.js`) |
| `web/vendor/qrcode.js` | Vendored `qrcode` (bundled with esbuild) |
| `server.py` | Stdlib static server |
| `start.bat` | One-click Windows launcher |

## Interact

- **Create** a new 12/24-word wallet or **import** a recovery phrase / private key.
- **Unlock** with your password on each visit.
- **Receive** shows a real scannable QR of your derived address.
- **Send** estimates the fee, then signs and broadcasts a real transaction.
- **Swap** does real token swaps through the Uniswap V2 interface (the standard
  shared by Uniswap / SushiSwap / PancakeSwap).
- **History** lists the transactions you've broadcast, with explorer links.
- **Settings** lets you reveal your phrase, switch derived accounts, lock, or
  delete the wallet.

## Regenerating the vendored libraries (optional)

`ethers`, Three.js and `qrcode` are already vendored, so the app works offline. To
rebuild:

```
pnpm install
node node_modules/esbuild/bin/esbuild node_modules/ethers/lib.esm/index.js \
  --bundle --format=iife --global-name=ethers --platform=browser --minify --outfile=web/vendor/ethers.js
node node_modules/esbuild/bin/esbuild node_modules/qrcode/lib/browser.js \
  --bundle --format=iife --global-name=QRCodeLib --outfile=web/vendor/qrcode.js
Copy-Item node_modules/three/build/three.module.js web/vendor/three.module.js
Copy-Item node_modules/three/build/three.core.js web/vendor/three.core.js
```
