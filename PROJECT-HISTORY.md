# Clay Wallet — Project History & Context

> Saved context of the conversation that led to the creation of this app.
> App: **Clay Wallet** 🧱🪙 — a self-custody EVM crypto wallet with a hand-made clay look.

---

## 10/5 00:21 — Initial request

> "code a crypto wallet app inspired by this trustwallet@C:\Users\micha\Downloads\latest.apk
> the visuals are clay style real 3d physical wallets and crypto coins and made from couch fabric and design, colors orange beige and mauve with round random 3d clay shapes"

**Completed in 13m 35s — initial build.**

🧱 Clay Wallet — a soft, squishy crypto wallet. A Trust Wallet–inspired wallet app with a real-time 3D clay + couch-fabric look. Live at http://127.0.0.1:8777/.

The 3D (Three.js, two scenes running live):
- **Hero wallet** — bifold wallet sewn from corduroy couch fabric (procedural corduroy texture), orange fabric piping, stitch beads, mauve clasp, fold crease. Drag to spin, idles and bobs gently.
- **Real 3D clay coins** — BTC/ETH/SOL/DOGE/LTC/POL as chunky clay coins with milled rims and embossed glyphs, a messy stack and a leaning coin. Tap a coin (or token row) to feature it.
- **Ambient background** — ~26 round random clay shapes (blobs, pills, donuts, tiles) drifting in orange/beige/mauve.

Wallet flows (Trust Wallet structure): Home (total balance + 24h change, quick actions, token list with clay-coin badges), Send → review sheet → "stamp" confirm → History (localStorage), Receive (QR + copy/share), History + Settings.

Notes: demo only at that point (not connected to any blockchain; pretend balances/prices/address). Fully vendored and offline (three.module.js + bundled qrcode.js); no build step, no network needed.

---

## 10/5 00:40 — Bug fix: phantom popup / blurred page

> "regarde la page que ta créé: ya un bug qui floute la page il semble avoir un popup mais il est pas au bon endoit on peut pas le voir ni interagir corrige ca"

**Completed in 42s — fixed.**

Cause: CSS conflict — the modal (`.sheet-backdrop`) had `display: flex` in the stylesheet, which overrode the browser's `hidden` attribute. Result: the dark overlay + `backdrop-filter: blur(2px)` showed at load, blurring the whole page with a near-empty card at the bottom (the "ghost popup").

Fix: `[hidden] { display: none !important; }` rule, giving priority back to the `hidden` attribute. The modal now only appears (blur + bottom-anchored card) when opening a "Review / Confirm" screen or a coin's sheet; `[hidden]` applied everywhere (toast, empty state, secret phrase…).

---

## 10/5 00:44 — Remove hero wallet, keep only coins + irregular shapes

> "i like the design but modify it so the only shapes are random crypto coins + round irreagular 3d shapes, instead of wallet + coins + random round shapes
> and remove the big space in the center of the wallet where we see the clay logo wallet. so all the randoms coins and round irregular shapes are in the background and not mixed in the wallet"

**Completed in 3m 8s — done.**

Removed: the clay wallet and the big hero box in the center (`wallet3d.js` deleted, hero markup + CSS removed).

Background is now exactly: ~14 floating crypto coins (₿/Ξ/◎/Ð/Ł/◆, gently tumbling and bobbing) + ~18 irregular round clay blobs (lumpy, squished pebbles — deformed spheres, not perfect spheres/donuts/pills). All in orange/beige/mauve, drifting behind the app. Wallet screen flows cleanly: greeting → total balance → Receive/Send/Buy → token list.

---

## 10/5 00:53 — Make it a real wallet

> "is it functionnal can i create a real wallet and use it"

**Completed in 15m 44s — now a real, self-custody EVM wallet (no longer a demo).**

- Create a real BIP-39 wallet (12 or 24 words), phrase shown once with warning.
- Import recovery phrase or private key.
- Password-protected: WebCrypto PBKDF2 (210k iters) + AES-GCM encryption before localStorage; keys only in memory while unlocked.
- Live balances on Ethereum, Polygon, Base — native + curated ERC-20s (USDC, USDT, DAI, LINK, UNI, WETH) via public RPCs; USD prices from CoinGecko.
- Real send: estimate gas, review, sign + broadcast real transaction (native and ERC-20), tx hash + explorer link in History.
- Receive: real QR of the actual derived address.
- Lock/delete wallet in Settings, reveal phrase.

Caveats at the time: sandbox had no outbound network (live RPC/send not testable from the agent side; verified crypto core against bundled ethers in Node — derivation, unit parsing, encrypt/decrypt round-trip). Public free RPCs (publicnode, llamarpc, ankr, Base) with fallback; CoinGecko for prices.

---

## 10/5 01:37 — "What's next to go live online, public, all platforms?"

**Completed in 24s — roadmap given.**

- **Track A (web, fast):** static hosting + CDN (Cloudflare Pages / Vercel / Netlify — `web/` folder, free tier), domain + HTTPS (mandatory: WebCrypto/clipboard require secure context), PWA (manifest + service worker), security headers (CSP, no-store, SRI, pinned versions).
- **Track B (all platforms):** web/PWA (low effort); iOS + Android via Capacitor (medium); desktop via Tauri/Electron (medium); browser extension MetaMask-style (high).
- **Production hardening for real money:** paid RPC (Alchemy/Infura/Ankr/QuickNode), security audit, feature completeness (multi-account, custom token, more chains, swaps, ENS, gas customization, on-chain history indexer, testnet mode), legal/compliance, ops (error tracking, analytics).

Recommended order: ① Sepolia testnet + PWA, ② deploy to Cloudflare Pages/Vercel with domain, ③ Capacitor for app stores after security hardening.

---

## 10/5 01:39 — "Do everything you can without paying a subscription"

**Completed in 6m 41s — everything free implemented + GO-LIVE.md written.**

Added (all $0):
- PWA / installable app — manifest, service worker (offline shell), generated clay-coin icons (192/512/maskable).
- 7 networks — Ethereum, Polygon, Base, Arbitrum, Optimism, BNB Chain + Sepolia testnet.
- Sepolia testnet + faucet link.
- Multi-account — 5 derived accounts (`m/44'/60'/0'/0/i`) with switcher in Settings.
- Custom token import — paste any ERC-20 address; reads symbol/decimals on-chain.
- Production security headers — CSP, X-Frame-Options DENY, nosniff, COOP… in `web/_headers`, `netlify.toml`, `vercel.json`, and the local server.
- Deploy-ready: the whole site is the `web/` folder, no build step.

User-side steps (in GO-LIVE.md): Cloudflare Pages drag-and-drop deploy (free `*.pages.dev` + HTTPS), domain ~$10–15/yr at Cloudflare Registrar, free Alchemy/Infura RPC key pasted into `chains.js`, app stores later (Apple $99/yr, Google $25 once) + Capacitor + Secure Enclave/Keystore.

---

## 10/5 01:59 — Remove irregular shapes, more + higher-quality clay coins

> "les formes irrégulieres sont laides. on va seulement garder un paquet de crypto coins en CLay comme ils sont deja, mais plus de coins, et en meilleurs qualité graphique, et partout en background, et on retire les formes irreguliere rondes"

**Completed in 1m 53s — done.**

- Irregular blobs removed — background now only clay crypto coins.
- 14 → 34 coins, spread over the whole screen (top, bottom, edges, varied depth).
- Better graphics: 512px coin-face textures (2× sharper) with embossed glyph (shadow + highlight + flat), milled edge, beveled ring + inner reflection, finer clay grain; denser geometry (64 segments vs 40); 4-source soft clay lighting (hemisphere + key + fill + rim); textures cached (no more 34 canvas re-creations per frame).
- Coins keep symbols (₿ Ξ ◎ Ð Ł ◆) and orange/beige/mauve colors, floating/turning/drifting gently.

---

## 10/5 02:08 — "Next step to deploy it all?"

**Completed in 36s — deployment recap + `clay-wallet-web.zip` delivered.**

Next: custom domain (the only cost, ~10–15 €/yr, Cloudflare Registrar → Pages → Custom domains, DNS auto-configured). Free alternatives: Vercel or Netlify (drag the `web/` folder). Free RPC key: alchemy.com → paste URL in `web/chains.js`. Full guide in GO-LIVE.md. Deliverable: **clay-wallet-web.zip** (deploy-ready package).

---

## 10/7 00:01 — Remove the "live balances & real sends" mention

> "Ethereum · Polygon · Base · live balances & real sends — delete this mention"

**Completed in 1m 6s — removed.**

Removed the line under the home-screen buttons, revalidated the build, regenerated the deploy zip. Also fixed the service worker: now **network-first** (always up-to-date when online) + version bump, so a single Ctrl+F5 was enough and future updates appear automatically.

---

## 10/8 12:04 — Add a Swap page (Uniswap-standard)

> "add a new page. same visuals etc. but this new page is about swapping crypto.
> just copy the industry standards: use the same swapping tool uniswap uses, for the same blockchains
> make it fit with the wallet page: offer the same blockchains on one and the other"

**Completed in 8m 47s — Swap page added, wired to the Uniswap V2 router interface (the standard shared by Uniswap/SushiSwap/PancakeSwap).**

- New "Swap" tab (tab bar now 6 tabs), same clay style, same network selector.
- Same blockchains as the wallet: Ethereum, Polygon, Base, Arbitrum, Optimism, BNB (+ Sepolia).
- Real quotes via `getAmountsOut`, real swaps via `swapExactETHForTokens` / `swapExactTokensForETH` / `swapExactTokensForTokens` — the industry standard.
- Full UX: in/out token pickers, ⇅ invert button, live quote (rate, route, minimum received), slippage 0.1/0.5/1%, then Approve → Swap, recorded in History (explorer link).
- Routers per chain (in `web/chains.js`): Ethereum → Uniswap V2 Router02; Polygon/Base/Arbitrum/Optimism → SushiSwap V2 (identical ABI); BNB → PancakeSwap V2; Sepolia → swap disabled (no canonical V2 router on this testnet).

Caveat: standard known deployments, centralized in `chains.js`, easy to fix; test small amounts and check pair liquidity.

---

## 10/8 12:14 — "je vois pas la page" (Swap page not visible)

**Completed in 1m 22s — it was a stale service-worker cache.**

The Swap page was deployed and served (verified in `index.html` + `app.js`), but the old service worker kept serving cached files. Fix for the user: Ctrl+Shift+R, or F12 → Application → Clear site data / Service Workers → Unregister. Code hardening: a desynchronized cached version can no longer crash the app (old index.html + new app.js). Deploy zip regenerated.

---

## 10/8 12:16 — "parfait montre moi la!"

**Completed in 40s — server relaunched with auto-open at http://127.0.0.1:8777/.**

What to see: 6 tabs at the bottom (Wallet · Send · Swap · Receive · History · Settings); the Swap tab shows Network chips, "You pay" card, ⇅ invert, "You receive" card with live quote, rate/route/minimum received/slippage, "Review swap" → Approve → Swap. (Headless-browser screenshots blocked in the agent environment — the live page is the demo.)

---

## Current state (end of this saved history)

- Static, no-build, vendored-offline app in `web/` (index.html, style.css, app.js, chains.js, vault.js, background.js, sw.js, manifest, icons, vendored ethers/three/qrcode).
- Real self-custody EVM wallet: BIP-39 create/import, PBKDF2+AES-GCM encrypted vault, live balances, real send, QR receive, History, Settings, 7 networks incl. Sepolia, 5 derived accounts, custom token import, Swap (Uniswap V2 standard).
- PWA with service worker (network-first), production security headers, deploy-ready for Cloudflare Pages / Vercel / Netlify (`clay-wallet-web.zip`).
- Preview: `python server.py` → http://127.0.0.1:8777/ (or `start.bat`).
- Remaining human steps: deploy to a static host, optional domain (~10–15 €/yr), optional free Alchemy RPC key, security audit + privacy policy before promoting a mainnet wallet.
