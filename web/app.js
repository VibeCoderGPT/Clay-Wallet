// =====================================================================
//  app.js — Clay Wallet: real self-custody EVM wallet (client-side).
//  Keys are generated and encrypted on-device and never leave the browser.
// =====================================================================
import { initBackground } from './background.js';
import { NETWORKS, networkById, ERC20_ABI, UNISWAP_V2_ROUTER_ABI } from './chains.js';
import { loadVault, saveVault, clearVault, encryptSecret, decryptSecret } from './vault.js';

const ethers = window.ethers;

const TX_KEY = 'clay-wallet-txs-v1';
const ACCOUNT_KEY = 'clay-wallet-account';
const CUSTOM_KEY = 'clay-wallet-custom-tokens';
const TOKEN_COLORS = { USDC: '#d9a952', USDT: '#9a6f9c', DAI: '#d9c3a5', LINK: '#a88fbb', UNI: '#e27b6a', WETH: '#e8894e' };

/* =====================================================================
   State
   ===================================================================== */
let wallet = null;        // ethers.Wallet (unlocked, in memory only)
let secret = null;        // mnemonic phrase or private key (in memory only)
let secretType = 'mnemonic';
let vault = null;
let pendingSecret = null;
let pendingType = 'mnemonic';
let currentNetwork = 'ethereum';
let sendNetwork = 'ethereum';
let sendAsset = null;
let prices = {};          // { coingeckoId: { usd } }
let balances = {};        // { networkId: { native: bigint, tokens: { symbol: bigint } } }
let providers = {};       // { networkId: JsonRpcProvider }
let accountIndex = 0;
let customTokens = loadCustomTokens();
let swapNetwork = 'ethereum';
let swapIn = null;
let swapOut = null;
let swapSlippage = 0.5;
let swapQuote = null;
let swapTimer = null;

/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function shadeHex(hex, f) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const c = (v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
  return '#' + [c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function tokenColor(sym) { return TOKEN_COLORS[sym] || '#cba4bd'; }
function priceOf(id) { return (prices[id] && prices[id].usd) || 0; }

function loadCustomTokens() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {}; } catch (e) { return {}; } }
function saveCustomTokens() { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customTokens)); }
function tokensFor(net) { return net.tokens.concat((customTokens[net.id] || []).map((t) => ({ ...t, custom: true }))); }
function loadAccountIndex() { try { return Math.max(0, parseInt(localStorage.getItem(ACCOUNT_KEY)) || 0); } catch (e) { return 0; } }
function deriveAccount(i) { return ethers.HDNodeWallet.fromPhrase(secret, undefined, "m/44'/60'/0'/0/" + i); }

const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
function fmtUSD(n) { return usd2.format(n); }

function fmtToken(wei, decimals) {
  if (wei == null) return '0';
  if (wei === 0n) return '0';
  const s = ethers.formatUnits(wei, decimals);
  const [int, frac] = s.split('.');
  if (!frac) return int;
  const f = frac.slice(0, 6).replace(/0+$/, '');
  return f ? `${int}.${f}` : int;
}

function shortAddr(a) { return a.length <= 14 ? a : a.slice(0, 8) + '…' + a.slice(-4); }
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const dd = Math.floor(h / 24);
  if (dd < 30) return dd + 'd ago';
  return new Date(ts).toLocaleDateString();
}
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => (el.hidden = true), 250);
  }, 2400);
}

async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    toast('Copied to clipboard');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copied to clipboard'); } catch (_) { toast('Copy failed'); }
    document.body.removeChild(ta);
  }
}

function openSheet(html) { $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; }
function closeSheet() { $('#sheet').hidden = true; $('#sheet-body').innerHTML = ''; }

function gateErr(msg) { const el = $('#gate-err'); if (el) el.textContent = msg; }

/* =====================================================================
   Navigation
   ===================================================================== */
function navigate(screen) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === screen));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.nav === screen));
  if (screen === 'receive') renderReceive();
  if (screen === 'history') renderHistory();
  if (screen === 'send') { renderSendNetworkChips(); renderSendAssets(); updateSendUsd(); }
  if (screen === 'swap') renderSwap();
}

/* =====================================================================
   Gate (create / import / unlock)
   ===================================================================== */
function showGate(renderFn) { $('#gate').hidden = false; renderFn(); }
function hideGate() { $('#gate').hidden = true; }

function generatePhrase(words) {
  return ethers.Mnemonic.fromEntropy(ethers.randomBytes(words === 24 ? 32 : 16)).phrase;
}

function renderWelcome() {
  $('#gate-body').innerHTML = `
    <div class="gate-logo">🪙</div>
    <h1 class="gate-title">Clay Wallet</h1>
    <p class="gate-sub">A real self-custody wallet. Your keys are created and kept on this device — never sent anywhere.</p>
    <div class="gate-actions">
      <button class="btn-primary" id="gate-create">Create new wallet</button>
      <button class="btn-secondary" id="gate-import">Import existing wallet</button>
    </div>`;
  $('#gate-create').addEventListener('click', () => renderCreate());
  $('#gate-import').addEventListener('click', () => renderImport());
}

function renderCreate() {
  $('#gate-body').innerHTML = `
    <button class="back-btn" id="gate-back">‹</button>
    <h1 class="gate-title">New wallet</h1>
    <p class="gate-sub">Choose the length of your recovery phrase.</p>
    <div class="gate-actions">
      <button class="btn-primary" id="gate-12">12 words — standard</button>
      <button class="btn-secondary" id="gate-24">24 words — extra secure</button>
    </div>`;
  $('#gate-back').addEventListener('click', () => renderWelcome());
  $('#gate-12').addEventListener('click', () => renderCreatePhrase(12));
  $('#gate-24').addEventListener('click', () => renderCreatePhrase(24));
}

function renderCreatePhrase(words, phrase) {
  const p = phrase || generatePhrase(words);
  pendingSecret = p;
  pendingType = 'mnemonic';
  const ws = p.split(' ');
  $('#gate-body').innerHTML = `
    <h1 class="gate-title">Your recovery phrase</h1>
    <p class="gate-sub">Write these words down, in order, on paper. Anyone who has them controls your funds.</p>
    <div class="mnemonic-grid">${ws.map((w, i) => `<span class="mw"><i>${i + 1}</i>${w}</span>`).join('')}</div>
    <div class="warn-box">⚠️ Never share this phrase. If you lose it, Clay Wallet cannot recover your funds.</div>
    <div class="gate-actions">
      <button class="btn-primary" id="gate-continue">I've written it down</button>
      <button class="btn-secondary" id="gate-back">Back</button>
    </div>`;
  $('#gate-continue').addEventListener('click', () => renderPassword('Create wallet', () => renderCreatePhrase(words, p)));
  $('#gate-back').addEventListener('click', () => renderCreate());
}

function renderImport() {
  $('#gate-body').innerHTML = `
    <button class="back-btn" id="gate-back">‹</button>
    <h1 class="gate-title">Import wallet</h1>
    <div class="radio-row">
      <button class="radio on" id="rt-phrase">Recovery phrase</button>
      <button class="radio" id="rt-key">Private key</button>
    </div>
    <label class="field-label">Secret</label>
    <div class="field-input"><textarea id="imp-secret" rows="3" placeholder="word1 word2 …  (or a 0x private key)" spellcheck="false"></textarea></div>
    <p class="gate-err" id="gate-err"></p>
    <div class="gate-actions">
      <button class="btn-primary" id="gate-next">Continue</button>
    </div>`;
  let mode = 'phrase';
  $('#rt-phrase').addEventListener('click', () => { mode = 'phrase'; $('#rt-phrase').classList.add('on'); $('#rt-key').classList.remove('on'); });
  $('#rt-key').addEventListener('click', () => { mode = 'key'; $('#rt-key').classList.add('on'); $('#rt-phrase').classList.remove('on'); });
  $('#gate-back').addEventListener('click', () => renderWelcome());
  $('#gate-next').addEventListener('click', () => {
    const val = $('#imp-secret').value.trim();
    if (!val) return gateErr('Paste your secret first');
    try {
      if (mode === 'key') {
        const k = val.startsWith('0x') ? val : '0x' + val;
        new ethers.Wallet(k); // validate
        pendingSecret = k; pendingType = 'privateKey';
      } else {
        ethers.Wallet.fromPhrase(val); // validate
        pendingSecret = val; pendingType = 'mnemonic';
      }
      renderPassword('Import wallet', () => renderImport());
    } catch (e) {
      gateErr('Invalid ' + (mode === 'key' ? 'private key' : 'recovery phrase'));
    }
  });
}

function renderPassword(doneLabel, onBack) {
  $('#gate-body').innerHTML = `
    <button class="back-btn" id="gate-back">‹</button>
    <h1 class="gate-title">Set a password</h1>
    <p class="gate-sub">Encrypts your keys on this device. You'll need it every time you unlock.</p>
    <label class="field-label">Password</label>
    <div class="field-input"><input type="password" id="pw1" placeholder="at least 8 characters" autocomplete="new-password"></div>
    <label class="field-label">Confirm password</label>
    <div class="field-input"><input type="password" id="pw2" placeholder="repeat it" autocomplete="new-password"></div>
    <p class="gate-err" id="gate-err"></p>
    <div class="gate-actions">
      <button class="btn-primary" id="gate-done">${doneLabel}</button>
      <button class="btn-secondary" id="gate-back2">Back</button>
    </div>`;
  $('#gate-back').addEventListener('click', onBack);
  $('#gate-back2').addEventListener('click', onBack);
  $('#gate-done').addEventListener('click', async () => {
    const pw1 = $('#pw1').value, pw2 = $('#pw2').value;
    if (pw1.length < 8) return gateErr('Use at least 8 characters');
    if (pw1 !== pw2) return gateErr('Passwords do not match');
    const btn = $('#gate-done');
    btn.disabled = true; btn.textContent = 'Encrypting…';
    try {
      const cipher = await encryptSecret(pendingSecret, pw1);
      vault = { type: pendingType, cipher };
      saveVault(vault);
      finishUnlock(pendingSecret, pendingType);
    } catch (e) {
      gateErr('Failed to encrypt: ' + e.message);
      btn.disabled = false; btn.textContent = doneLabel;
    }
  });
}

function renderUnlock() {
  $('#gate-body').innerHTML = `
    <div class="gate-logo">🪙</div>
    <h1 class="gate-title">Unlock Clay Wallet</h1>
    <p class="gate-sub">Enter your password to decrypt your keys.</p>
    <label class="field-label">Password</label>
    <div class="field-input"><input type="password" id="pw1" placeholder="••••••••" autocomplete="current-password"></div>
    <p class="gate-err" id="gate-err"></p>
    <div class="gate-actions">
      <button class="btn-primary" id="gate-unlock">Unlock</button>
    </div>
    <p class="gate-foot"><a href="#" id="gate-forgot">Forgot password? delete &amp; start over</a></p>`;
  $('#gate-unlock').addEventListener('click', async () => {
    const pw = $('#pw1').value;
    if (!pw) return gateErr('Enter your password');
    const btn = $('#gate-unlock');
    btn.disabled = true; btn.textContent = 'Unlocking…';
    try {
      const s = await decryptSecret(vault.cipher, pw);
      finishUnlock(s, vault.type || 'mnemonic');
    } catch (e) {
      gateErr('Wrong password');
      btn.disabled = false; btn.textContent = 'Unlock';
    }
  });
  $('#gate-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('This will permanently delete the encrypted wallet on this device. Continue?')) {
      clearVault(); localStorage.removeItem(TX_KEY); location.reload();
    }
  });
}

function finishUnlock(s, type) {
  secret = s;
  secretType = type;
  if (type === 'privateKey') {
    accountIndex = 0;
    wallet = new ethers.Wallet(s);
  } else {
    accountIndex = loadAccountIndex();
    wallet = deriveAccount(accountIndex);
  }
  pendingSecret = null;
  hideGate();
  onWalletReady();
}

/* =====================================================================
   Networks / prices / balances
   ===================================================================== */
async function getProvider(net) {
  if (providers[net.id]) return providers[net.id];
  let lastErr;
  for (const url of net.rpcs) {
    try {
      const p = new ethers.JsonRpcProvider(url, new ethers.Network(net.name, net.chainId));
      await p.getBlockNumber();
      providers[net.id] = p;
      return p;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('No RPC available for ' + net.name);
}

async function loadPrices() {
  const ids = new Set();
  const addId = (id) => { if (id) ids.add(id); };
  NETWORKS.forEach((n) => { addId(n.coingecko); tokensFor(n).forEach((t) => addId(t.coingecko)); });
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + [...ids].join(',') + '&vs_currencies=usd';
  const r = await fetch(url);
  if (!r.ok) throw new Error('price status ' + r.status);
  prices = await r.json();
}

async function loadBalances() {
  await Promise.all(NETWORKS.map(async (net) => {
    try {
      const provider = await getProvider(net);
      const native = await provider.getBalance(wallet.address);
      const tokens = {};
      await Promise.all(tokensFor(net).map(async (tk) => {
        try {
          const c = new ethers.Contract(tk.address, ERC20_ABI, provider);
          tokens[tk.symbol] = await c.balanceOf(wallet.address);
        } catch (e) { tokens[tk.symbol] = 0n; }
      }));
      balances[net.id] = { native, tokens };
    } catch (e) {
      balances[net.id] = { native: 0n, tokens: {} };
    }
  }));
}

function totalUsd() {
  let sum = 0;
  NETWORKS.forEach((net) => {
    const d = balances[net.id];
    if (!d) return;
    const np = priceOf(net.coingecko);
    sum += Number(ethers.formatUnits(d.native || 0n, net.nativeDecimals)) * np;
    tokensFor(net).forEach((tk) => {
      const w = (d.tokens && d.tokens[tk.symbol]) || 0n;
      if (w > 0n) sum += Number(ethers.formatUnits(w, tk.decimals)) * priceOf(tk.coingecko);
    });
  });
  return sum;
}

async function refreshData() {
  $('#total-change').textContent = 'loading…';
  try { await loadPrices(); } catch (e) { /* prices stay {} */ }
  try { await loadBalances(); } catch (e) { /* balances stay {} */ }
  renderTotal();
  renderAssetList();
  renderSendAssets();
  updateSendUsd();
}

/* =====================================================================
   Render — main wallet
   ===================================================================== */
function onWalletReady() {
  const addr = wallet.address;
  $('#avatar').textContent = addr.slice(2, 4).toUpperCase();
  $('#greeting').textContent = greeting();
  $('#address-short').textContent = shortAddr(addr);
  $('#wallet-type').textContent = secretType === 'privateKey' ? 'Imported · private key' : 'Recovery phrase';
  navigate('wallet');
  renderNetworkChips();
  renderHistory();
  renderReceive();
  refreshData();
}

function renderTotal() {
  $('#total-value').textContent = fmtUSD(totalUsd());
  const el = $('#total-change');
  el.textContent = Object.keys(balances).length ? 'across ' + NETWORKS.length + ' networks' : 'connecting…';
  el.style.color = '#7c6049';
  el.style.background = 'rgba(199,173,139,.25)';
}

function renderNetworkChips() {
  const host = $('#network-chips');
  host.innerHTML = '';
  NETWORKS.forEach((n) => {
    const b = document.createElement('button');
    b.className = 'net-chip' + (n.id === currentNetwork ? ' on' : '');
    b.innerHTML = `<span class="net-dot" style="background:${n.clay}"></span>${n.name}`;
    b.addEventListener('click', () => { currentNetwork = n.id; renderNetworkChips(); renderAssetList(); });
    host.appendChild(b);
  });
}

function renderAssetList() {
  const net = networkById(currentNetwork);
  const list = $('#token-list');
  const data = balances[net.id];
  $('#coin-count').textContent = net.testnet ? net.name + ' · testnet' : net.name;

  if (!data) {
    list.innerHTML = '<div class="empty-state">Fetching ' + net.name + ' balance…</div>';
    return;
  }

  const rows = [];
  const nativeWei = data.native || 0n;
  rows.push({
    name: net.name, symbol: net.native, clay: net.clay,
    amount: fmtToken(nativeWei, net.nativeDecimals),
    usd: Number(ethers.formatUnits(nativeWei, net.nativeDecimals)) * priceOf(net.coingecko),
  });
  tokensFor(net).forEach((tk) => {
    const w = (data.tokens && data.tokens[tk.symbol]) || 0n;
    if (w > 0n) {
      rows.push({
        name: tk.symbol, symbol: tk.symbol, clay: tokenColor(tk.symbol),
        amount: fmtToken(w, tk.decimals),
        usd: Number(ethers.formatUnits(w, tk.decimals)) * priceOf(tk.coingecko),
      });
    }
  });

  let html = '';
  if (net.testnet && net.faucet) {
    html += `<a class="faucet-banner" href="${net.faucet}" target="_blank" rel="noopener noreferrer">💧 Testnet — get free ${net.native} from a faucet ↗</a>`;
  }
  if (!rows.length) {
    html += '<div class="empty-state">No balance on ' + net.name + ' yet.<br>Deposit to get started.</div>';
  } else {
    rows.forEach((r) => {
      const light = shadeHex(r.clay, 0.42), dark = shadeHex(r.clay, -0.18);
      html += `
        <div class="token-row">
          <div class="clay-coin" style="background: radial-gradient(circle at 32% 28%, ${light}, ${r.clay} 52%, ${dark})">${r.symbol.slice(0, 1)}</div>
          <div class="t-main"><div class="t-name">${r.name}</div><div class="t-symbol">${r.amount} ${r.symbol}</div></div>
          <div class="t-right"><div class="t-balance">${fmtUSD(r.usd)}</div></div>
        </div>`;
    });
  }
  list.innerHTML = html;
}

/* =====================================================================
   Render — send
   ===================================================================== */
function renderSendNetworkChips() {
  const host = $('#send-network');
  host.innerHTML = '';
  NETWORKS.forEach((n) => {
    const b = document.createElement('button');
    b.className = 'net-chip' + (n.id === sendNetwork ? ' on' : '');
    b.innerHTML = `<span class="net-dot" style="background:${n.clay}"></span>${n.name}`;
    b.addEventListener('click', () => { sendNetwork = n.id; sendAsset = null; renderSendNetworkChips(); renderSendAssets(); updateSendUsd(); });
    host.appendChild(b);
  });
}

function sendAssets() {
  const net = networkById(sendNetwork);
  const data = balances[net.id];
  const assets = [{
    kind: 'native', symbol: net.native, name: net.name, decimals: net.nativeDecimals,
    address: null, coingecko: net.coingecko, clay: net.clay,
    balance: (data && data.native) || 0n,
  }];
  tokensFor(net).forEach((tk) => {
    assets.push({
      kind: 'token', symbol: tk.symbol, name: tk.symbol, decimals: tk.decimals,
      address: tk.address, coingecko: tk.coingecko, clay: tokenColor(tk.symbol),
      balance: (data && data.tokens[tk.symbol]) || 0n,
    });
  });
  return assets;
}

function renderSendAssets() {
  const host = $('#send-assets');
  host.innerHTML = '';
  const assets = sendAssets();
  const valid = sendAsset && assets.some((a) => a.kind === sendAsset.kind && a.symbol === sendAsset.symbol);
  if (!valid) sendAsset = assets[0];

  assets.forEach((a) => {
    const chip = document.createElement('button');
    const sel = sendAsset && sendAsset.kind === a.kind && sendAsset.symbol === a.symbol;
    chip.className = 'coin-chip' + (sel ? ' selected' : '');
    const light = shadeHex(a.clay, 0.42), dark = shadeHex(a.clay, -0.18);
    chip.innerHTML = `<span class="clay-coin sm" style="background: radial-gradient(circle at 32% 28%, ${light}, ${a.clay} 52%, ${dark})">${a.symbol.slice(0, 1)}</span>${a.symbol}`;
    chip.addEventListener('click', () => { sendAsset = a; renderSendAssets(); updateSendUsd(); });
    host.appendChild(chip);
  });
}

function updateSendUsd() {
  const a = sendAsset || sendAssets()[0];
  const amt = parseFloat($('#send-amount').value.replace(',', '.')) || 0;
  $('#send-usd').textContent = '≈ ' + fmtUSD(amt * priceOf(a.coingecko));
}

/* =====================================================================
   Render — receive / history
   ===================================================================== */
async function renderReceive() {
  if (!wallet) return;
  $('#address-full-text').textContent = wallet.address;
  const img = $('#qr-img');
  try {
    if (window.QRCodeLib) {
      const url = await QRCodeLib.toDataURL(wallet.address, {
        errorCorrectionLevel: 'M', margin: 1, width: 220,
        color: { dark: '#4a3526', light: '#fffaf0' },
      });
      img.src = url;
    }
  } catch (e) { img.alt = 'QR unavailable'; }
}

function loadTxs() { try { return JSON.parse(localStorage.getItem(TX_KEY)) || []; } catch (e) { return []; } }
function recordTx(tx) { const t = loadTxs(); t.unshift(tx); localStorage.setItem(TX_KEY, JSON.stringify(t.slice(0, 100))); }

function renderHistory() {
  const list = $('#tx-list');
  const empty = $('#tx-empty');
  const txs = loadTxs();
  empty.hidden = txs.length > 0;
  list.innerHTML = '';
  txs.forEach((tx) => {
    const net = NETWORKS.find((n) => n.name === tx.network);
    const link = net ? net.explorer + '/tx/' + tx.hash : '#';
    const isSwap = tx.kind === 'swap';
    const title = isSwap ? 'Swapped ' + tx.symbol + ' → ' + tx.symbolOut : 'Sent ' + tx.symbol;
    const meta = isSwap ? timeAgo(tx.time) : timeAgo(tx.time) + ' · ' + shortAddr(tx.to || '');
    const row = document.createElement('div');
    row.className = 'tx-row';
    row.innerHTML = `
      <div class="clay-coin sm" style="background: radial-gradient(circle at 32% 28%, #f5b074, #e8894e 55%, #c16f38)">${isSwap ? '⇄' : '↑'}</div>
      <div class="tx-main"><div class="tx-title">${title}</div><div class="tx-meta">${meta}</div></div>
      <div class="tx-right">
        <div class="tx-amount out">−${tx.amount} ${tx.symbol}</div>
        <a class="tx-link" href="${link}" target="_blank" rel="noopener noreferrer">view ↗</a>
      </div>`;
    list.appendChild(row);
  });
}

/* =====================================================================
   Send (real)
   ===================================================================== */
async function doSend() {
  const net = networkById(sendNetwork);
  const a = sendAsset || sendAssets()[0];
  const raw = $('#send-amount').value.replace(',', '.').trim();
  const to = $('#send-to').value.trim();

  if (!raw || isNaN(parseFloat(raw)) || parseFloat(raw) <= 0) { toast('Enter an amount'); return; }
  if (!ethers.isAddress(to)) { toast('Enter a valid 0x address'); return; }

  let amountWei;
  try { amountWei = ethers.parseUnits(raw, a.decimals); } catch (e) { toast('Invalid amount'); return; }
  if (amountWei > (a.balance || 0n)) { toast('Not enough ' + a.symbol); return; }

  toast('Estimating fee…');
  let feeWei = 0n;
  try {
    const provider = await getProvider(net);
    const signer = wallet.connect(provider);
    let tx;
    if (a.kind === 'token') {
      const c = new ethers.Contract(a.address, ERC20_ABI, signer);
      tx = await c.transfer.populateTransaction(to, amountWei);
    } else {
      tx = { to, value: amountWei };
    }
    const gasLimit = await provider.estimateGas({ ...tx, from: wallet.address });
    const fd = await provider.getFeeData();
    feeWei = gasLimit * (fd.maxFeePerGas || fd.gasPrice || 0n);
  } catch (e) {
    toast('Fee estimate failed: ' + (e.shortMessage || e.message));
    return;
  }

  const feeEth = Number(ethers.formatUnits(feeWei, net.nativeDecimals));
  openReviewSheet(net, a, to, raw, amountWei, feeEth, feeWei);
}

function openReviewSheet(net, a, to, rawAmount, amountWei, feeEth, feeWei) {
  const usd = parseFloat(rawAmount) * priceOf(a.coingecko);
  openSheet(`
    <h3>Confirm send</h3>
    <div class="summary-row"><span>Network</span><b>${net.name}</b></div>
    <div class="summary-row"><span>Asset</span><b>${a.symbol}</b></div>
    <div class="summary-row"><span>Amount</span><b>${fmtToken(amountWei, a.decimals)} ${a.symbol}</b></div>
    <div class="summary-row"><span>To</span><b>${shortAddr(to)}</b></div>
    <div class="summary-row"><span>Network fee (est.)</span><b>${fmtToken(feeWei, net.nativeDecimals)} ${net.native} ≈ ${fmtUSD(feeEth * priceOf(net.coingecko))}</b></div>
    <div class="summary-row"><span>Total value</span><b>${fmtUSD(usd)}</b></div>
    <button class="btn-primary" id="sheet-confirm" style="margin-top:16px">Confirm &amp; broadcast</button>
    <button class="btn-secondary" id="sheet-cancel" style="margin-top:10px">Cancel</button>`);
  $('#sheet-confirm').addEventListener('click', async () => {
    const btn = $('#sheet-confirm');
    btn.disabled = true; btn.textContent = 'Broadcasting…';
    try {
      const hash = await broadcast(net, a, to, amountWei);
      recordTx({ hash, network: net.name, symbol: a.symbol, amount: fmtToken(amountWei, a.decimals), to, time: Date.now() });
      closeSheet();
      toast('Sent ' + a.symbol + ' · tx submitted');
      navigate('wallet');
      renderHistory();
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Confirm &amp; broadcast';
      toast('Send failed: ' + (e.shortMessage || e.message));
    }
  });
  $('#sheet-cancel').addEventListener('click', closeSheet);
}

async function broadcast(net, a, to, amountWei) {
  const provider = await getProvider(net);
  const signer = wallet.connect(provider);
  if (a.kind === 'token') {
    const c = new ethers.Contract(a.address, ERC20_ABI, signer);
    const tx = await c.transfer(to, amountWei);
    return tx.hash;
  }
  const tx = await signer.sendTransaction({ to, value: amountWei });
  return tx.hash;
}

/* =====================================================================
   Swap (Uniswap V2 router — same interface as Uniswap/Sushi/Pancake)
   ===================================================================== */
function swapAssets() {
  const net = networkById(swapNetwork);
  const data = balances[net.id];
  const assets = [{
    kind: 'native', symbol: net.native, name: net.name, decimals: net.nativeDecimals,
    address: null, coingecko: net.coingecko, clay: net.clay,
    balance: (data && data.native) || 0n,
  }];
  tokensFor(net).forEach((tk) => {
    assets.push({
      kind: 'token', symbol: tk.symbol, name: tk.symbol, decimals: tk.decimals,
      address: tk.address, coingecko: tk.coingecko, clay: tokenColor(tk.symbol),
      balance: (data && data.tokens[tk.symbol]) || 0n,
    });
  });
  return assets;
}

function sameAsset(a, b) { return a && b && a.kind === b.kind && a.symbol === b.symbol; }

function renderSwapNetworkChips() {
  const host = $('#swap-network');
  host.innerHTML = '';
  NETWORKS.forEach((n) => {
    const b = document.createElement('button');
    b.className = 'net-chip' + (n.id === swapNetwork ? ' on' : '');
    b.innerHTML = `<span class="net-dot" style="background:${n.clay}"></span>${n.name}`;
    b.addEventListener('click', () => { swapNetwork = n.id; swapIn = null; swapOut = null; renderSwap(); });
    host.appendChild(b);
  });
}

function swapTokenHTML(a) {
  const light = shadeHex(a.clay, 0.42), dark = shadeHex(a.clay, -0.18);
  return `<span class="clay-coin sm" style="background: radial-gradient(circle at 32% 28%, ${light}, ${a.clay} 52%, ${dark})">${a.symbol.slice(0, 1)}</span>${a.symbol}<span class="swap-caret">▾</span>`;
}

function renderSwap() {
  const net = networkById(swapNetwork);
  const assets = swapAssets();
  if (!swapIn || !assets.some((a) => sameAsset(a, swapIn))) swapIn = assets[0];
  if (!swapOut || !assets.some((a) => sameAsset(a, swapOut))) swapOut = assets.find((a) => !sameAsset(a, swapIn)) || assets[1] || assets[0];
  if (sameAsset(swapIn, swapOut)) swapOut = assets.find((a) => !sameAsset(a, swapIn)) || assets[0];

  renderSwapNetworkChips();
  $('#swap-in-token').innerHTML = swapTokenHTML(swapIn);
  $('#swap-out-token').innerHTML = swapTokenHTML(swapOut);
  $('#swap-in-bal').textContent = 'Balance: ' + fmtToken(swapIn.balance || 0n, swapIn.decimals);
  $('#swap-out-bal').textContent = 'Balance: ' + fmtToken(swapOut.balance || 0n, swapOut.decimals);

  const btn = $('#swap-btn');
  if (!net.swap || !net.swap.router) {
    btn.disabled = true;
    btn.textContent = 'Swap unavailable on ' + net.name;
    $('#swap-details').hidden = true;
    $('#swap-amount-out').textContent = '—';
    return;
  }
  btn.disabled = false;
  updateSwapQuote();
}

function swapPath(inAsset, outAsset, net) {
  const w = net.swap.wrapped;
  const aIn = inAsset.kind === 'native' ? w : inAsset.address;
  const aOut = outAsset.kind === 'native' ? w : outAsset.address;
  if (aIn.toLowerCase() === w.toLowerCase()) return [aIn, aOut];
  if (aOut.toLowerCase() === w.toLowerCase()) return [aIn, aOut];
  return [aIn, w, aOut];
}

async function updateSwapQuote() {
  const net = networkById(swapNetwork);
  const btn = $('#swap-btn');
  const details = $('#swap-details');
  if (!net.swap || !net.swap.router) return;
  const raw = $('#swap-amount').value.replace(',', '.').trim();
  const amount = parseFloat(raw);
  if (!raw || isNaN(amount) || amount <= 0) {
    swapQuote = null;
    $('#swap-amount-out').textContent = '—';
    details.hidden = true;
    btn.textContent = 'Enter an amount';
    return;
  }
  let amountInWei;
  try { amountInWei = ethers.parseUnits(raw, swapIn.decimals); } catch (e) { return; }
  if (amountInWei > (swapIn.balance || 0n)) {
    swapQuote = null;
    $('#swap-amount-out').textContent = '—';
    details.hidden = true;
    btn.textContent = 'Insufficient ' + swapIn.symbol;
    return;
  }
  btn.textContent = 'Loading quote…';
  try {
    const provider = await getProvider(net);
    const router = new ethers.Contract(net.swap.router, UNISWAP_V2_ROUTER_ABI, provider);
    const path = swapPath(swapIn, swapOut, net);
    const amounts = await router.getAmountsOut(amountInWei, path);
    const amountOut = amounts[amounts.length - 1];
    swapQuote = { amountOut, path, amountIn: amountInWei };
    const minOut = amountOut * (10000n - BigInt(Math.round(swapSlippage * 100))) / 10000n;
    const rate = Number(ethers.formatUnits(amountOut, swapOut.decimals)) / Number(ethers.formatUnits(amountInWei, swapIn.decimals));
    const route = (swapIn.kind === 'native' || swapOut.kind === 'native')
      ? `${swapIn.symbol} → ${swapOut.symbol}`
      : `${swapIn.symbol} → ${net.native} → ${swapOut.symbol}`;
    $('#swap-amount-out').textContent = fmtToken(amountOut, swapOut.decimals);
    details.innerHTML = `
      <div class="summary-row"><span>Rate</span><b>1 ${swapIn.symbol} = ${rate.toPrecision(6)} ${swapOut.symbol}</b></div>
      <div class="summary-row"><span>Route</span><b>${route}</b></div>
      <div class="summary-row"><span>Minimum received</span><b>${fmtToken(minOut, swapOut.decimals)} ${swapOut.symbol}</b></div>
      <div class="summary-row"><span>Slippage</span><b>${swapSlippage}%</b></div>`;
    details.hidden = false;
    btn.textContent = 'Review swap';
  } catch (e) {
    swapQuote = null;
    $('#swap-amount-out').textContent = '—';
    details.hidden = true;
    btn.textContent = 'No route found';
  }
}

function openSwapTokenPicker(side) {
  const assets = swapAssets();
  openSheet(`<h3>Select token</h3><div class="coin-picker">${assets.map((a, i) => {
    const light = shadeHex(a.clay, 0.42), dark = shadeHex(a.clay, -0.18);
    return `<button class="coin-chip" id="st-${i}"><span class="clay-coin sm" style="background: radial-gradient(circle at 32% 28%, ${light}, ${a.clay} 52%, ${dark})">${a.symbol.slice(0, 1)}</span>${a.symbol}</button>`;
  }).join('')}</div>
    <button class="btn-secondary" id="st-close" style="margin-top:12px">Cancel</button>`);
  assets.forEach((a, i) => {
    $('#st-' + i).addEventListener('click', () => {
      if (side === 'in') swapIn = a; else swapOut = a;
      closeSheet();
      $('#swap-amount').value = '';
      renderSwap();
    });
  });
  $('#st-close').addEventListener('click', closeSheet);
}

function openSwapReview() {
  if (!swapQuote) { toast('Enter an amount first'); return; }
  const net = networkById(swapNetwork);
  const quote = swapQuote;
  const minOut = quote.amountOut * (10000n - BigInt(Math.round(swapSlippage * 100))) / 10000n;
  openSheet(`
    <h3>Confirm swap</h3>
    <div class="summary-row"><span>Network</span><b>${net.name}</b></div>
    <div class="summary-row"><span>You pay</span><b>${fmtToken(quote.amountIn, swapIn.decimals)} ${swapIn.symbol}</b></div>
    <div class="summary-row"><span>You receive</span><b>≈ ${fmtToken(quote.amountOut, swapOut.decimals)} ${swapOut.symbol}</b></div>
    <div class="summary-row"><span>Minimum received</span><b>${fmtToken(minOut, swapOut.decimals)} ${swapOut.symbol}</b></div>
    <div class="summary-row"><span>Slippage</span><b>${swapSlippage}%</b></div>
    <div class="summary-row"><span>Provider</span><b>Uniswap V2 router</b></div>
    <button class="btn-primary" id="swap-confirm" style="margin-top:16px">Confirm &amp; swap</button>
    <button class="btn-secondary" id="swap-cancel" style="margin-top:10px">Cancel</button>`);
  $('#swap-confirm').addEventListener('click', () => executeSwap(net, minOut, quote));
  $('#swap-cancel').addEventListener('click', closeSheet);
}

async function executeSwap(net, minOut, quote) {
  const btn = $('#swap-confirm');
  const deadline = Math.floor(Date.now() / 1000) + 1200;
  try {
    const signer = wallet.connect(await getProvider(net));
    if (swapIn.kind === 'token') {
      const token = new ethers.Contract(swapIn.address, ERC20_ABI, signer);
      const allowance = await token.allowance(wallet.address, net.swap.router);
      if (allowance < quote.amountIn) {
        btn.textContent = 'Approving ' + swapIn.symbol + '…';
        const appr = await token.approve(net.swap.router, ethers.MaxUint256);
        await appr.wait();
      }
    }
    btn.textContent = 'Swapping…';
    const router = new ethers.Contract(net.swap.router, UNISWAP_V2_ROUTER_ABI, signer);
    let tx;
    if (swapIn.kind === 'native') {
      tx = await router.swapExactETHForTokens(minOut, quote.path, wallet.address, deadline, { value: quote.amountIn });
    } else if (swapOut.kind === 'native') {
      tx = await router.swapExactTokensForETH(quote.amountIn, minOut, quote.path, wallet.address, deadline);
    } else {
      tx = await router.swapExactTokensForTokens(quote.amountIn, minOut, quote.path, wallet.address, deadline);
    }
    recordTx({ hash: tx.hash, network: net.name, kind: 'swap', symbol: swapIn.symbol, symbolOut: swapOut.symbol, amount: fmtToken(quote.amountIn, swapIn.decimals), to: net.swap.router, time: Date.now() });
    closeSheet();
    toast('Swap submitted · ' + swapIn.symbol + ' → ' + swapOut.symbol);
    navigate('wallet');
    renderHistory();
    refreshData();
  } catch (e) {
    btn.textContent = 'Confirm &amp; swap';
    toast('Swap failed: ' + (e.shortMessage || e.message));
  }
}

/* =====================================================================
   Accounts + custom tokens
   ===================================================================== */
function renderAccountsSheet() {
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const addr = deriveAccount(i).address;
    rows.push(`
      <button class="account-row${i === accountIndex ? ' on' : ''}" id="acct-${i}">
        <span class="acct-idx">${i + 1}</span>
        <span class="acct-addr">${addr}</span>
        ${i === accountIndex ? '<span class="acct-cur">●</span>' : ''}
      </button>`);
  }
  openSheet(`<h3>Accounts</h3><div class="account-list">${rows.join('')}</div>
    <button class="btn-secondary" id="acct-close" style="margin-top:12px">Close</button>`);
  for (let i = 0; i < 5; i++) {
    $('#acct-' + i).addEventListener('click', () => { closeSheet(); switchAccount(i); });
  }
  $('#acct-close').addEventListener('click', closeSheet);
}

function switchAccount(i) {
  accountIndex = i;
  localStorage.setItem(ACCOUNT_KEY, String(i));
  wallet = deriveAccount(i);
  balances = {}; prices = {}; providers = {};
  const addr = wallet.address;
  $('#avatar').textContent = addr.slice(2, 4).toUpperCase();
  $('#address-short').textContent = shortAddr(addr);
  renderReceive();
  refreshData();
  toast('Switched to account ' + (i + 1));
}

function renderImportTokenSheet() {
  let itokNetwork = currentNetwork;
  openSheet(`
    <h3>Import token</h3>
    <label class="field-label">Network</label>
    <div class="net-chips" id="itok-net"></div>
    <label class="field-label">Token contract address</label>
    <div class="field-input"><input type="text" id="itok-addr" placeholder="0x…" spellcheck="false"></div>
    <p class="gate-err" id="itok-err"></p>
    <button class="btn-primary" id="itok-go">Import</button>
    <button class="btn-secondary" id="itok-close" style="margin-top:10px">Cancel</button>`);
  const host = $('#itok-net');
  NETWORKS.forEach((n) => {
    const b = document.createElement('button');
    b.className = 'net-chip' + (n.id === itokNetwork ? ' on' : '');
    b.dataset.id = n.id;
    b.innerHTML = `<span class="net-dot" style="background:${n.clay}"></span>${n.name}`;
    b.addEventListener('click', () => {
      itokNetwork = n.id;
      [...host.children].forEach((c) => c.classList.toggle('on', c.dataset.id === n.id));
    });
    host.appendChild(b);
  });
  $('#itok-go').addEventListener('click', async () => {
    const addr = $('#itok-addr').value.trim();
    if (!ethers.isAddress(addr)) { $('#itok-err').textContent = 'Enter a valid 0x contract address'; return; }
    const net = networkById(itokNetwork);
    const btn = $('#itok-go');
    btn.disabled = true; btn.textContent = 'Reading contract…';
    try {
      const provider = await getProvider(net);
      const c = new ethers.Contract(addr, ERC20_ABI, provider);
      const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]);
      const existing = (customTokens[net.id] || []).some((t) => t.address.toLowerCase() === addr.toLowerCase());
      if (existing) { closeSheet(); toast('Token already imported'); return; }
      customTokens[net.id] = customTokens[net.id] || [];
      customTokens[net.id].push({ symbol: symbol.trim(), address: addr, decimals: Number(decimals), coingecko: null });
      saveCustomTokens();
      closeSheet();
      toast('Imported ' + symbol.trim());
      refreshData();
    } catch (e) {
      $('#itok-err').textContent = 'Not a valid ERC-20 contract: ' + (e.shortMessage || e.message);
      btn.disabled = false; btn.textContent = 'Import';
    }
  });
  $('#itok-close').addEventListener('click', closeSheet);
}

/* =====================================================================
   Init
   ===================================================================== */
function wireEvents() {
  $$('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
  $('#address-chip').addEventListener('click', () => { if (wallet) copyText(wallet.address); });
  $('#btn-notify').addEventListener('click', () => toast('Live on ' + NETWORKS.length + ' networks'));
  $('#btn-buy').addEventListener('click', () => {
    if (!wallet) return;
    openSheet(`
      <h3>Get crypto</h3>
      <p class="sheet-p">Buy crypto on an exchange (MoonPay, Coinbase, Binance…) and send it to your address:</p>
      <button class="address-card" id="buy-addr" style="margin-top:8px">${wallet.address}<span class="copy-ic">⧉</span></button>
      <div class="row-actions" style="margin-top:14px">
        <button class="btn-secondary" id="buy-copy">Copy address</button>
        <button class="btn-secondary" id="buy-close">Close</button>
      </div>`);
    $('#buy-addr').addEventListener('click', () => copyText(wallet.address));
    $('#buy-copy').addEventListener('click', () => copyText(wallet.address));
    $('#buy-close').addEventListener('click', closeSheet);
  });

  // send
  $('#send-amount').addEventListener('input', updateSendUsd);
  $('#btn-max').addEventListener('click', () => {
    const a = sendAsset || sendAssets()[0];
    $('#send-amount').value = fmtToken(a.balance || 0n, a.decimals);
    updateSendUsd();
  });
  $('#btn-paste').addEventListener('click', async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { $('#send-to').value = t.trim(); toast('Pasted'); } else toast('Clipboard is empty');
    } catch (e) { toast('Clipboard access denied'); }
  });
  $('#btn-review').addEventListener('click', doSend);

  // swap (guarded so a stale cached index.html can never crash the app)
  if ($('#swap-amount')) {
    $('#swap-amount').addEventListener('input', () => {
      clearTimeout(swapTimer);
      swapTimer = setTimeout(updateSwapQuote, 400);
    });
    $('#swap-in-token').addEventListener('click', () => openSwapTokenPicker('in'));
    $('#swap-out-token').addEventListener('click', () => openSwapTokenPicker('out'));
    $('#swap-flip').addEventListener('click', () => {
      const t = swapIn; swapIn = swapOut; swapOut = t;
      $('#swap-amount').value = '';
      renderSwap();
    });
    $$('.slip').forEach((b) => b.addEventListener('click', () => {
      swapSlippage = parseFloat(b.dataset.slip);
      $$('.slip').forEach((x) => x.classList.toggle('on', x === b));
      updateSwapQuote();
    }));
    $('#swap-btn').addEventListener('click', openSwapReview);
  }

  // receive
  $('#btn-copy').addEventListener('click', () => { if (wallet) copyText(wallet.address); });
  $('#address-full').addEventListener('click', () => { if (wallet) copyText(wallet.address); });
  $('#btn-share').addEventListener('click', async () => {
    if (!wallet) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'My Clay Wallet address', text: wallet.address }); return; } catch (e) { /* cancelled */ }
    }
    copyText(wallet.address);
  });

  // settings
  let phraseShown = false;
  $('#btn-phrase').addEventListener('click', () => {
    if (!secret) return;
    phraseShown = !phraseShown;
    const el = $('#phrase');
    if (!phraseShown) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = secretType === 'privateKey' ? ('Private key: ' + secret) : secret;
    toast('Keep this secret!');
  });
  $('#btn-lock').addEventListener('click', () => {
    wallet = null; secret = null; balances = {}; prices = {}; providers = {};
    navigate('wallet');
    showGate(renderUnlock);
  });
  $('#btn-delete').addEventListener('click', () => {
    if (confirm('Permanently delete the encrypted wallet on this device?')) {
      clearVault(); localStorage.removeItem(TX_KEY); location.reload();
    }
  });
  $('#btn-accounts').addEventListener('click', () => {
    if (secretType === 'privateKey') { toast('Single account (private key import)'); return; }
    renderAccountsSheet();
  });
  $('#btn-import-token').addEventListener('click', () => renderImportTokenSheet());

  // close sheet by tapping backdrop
  $('#sheet').addEventListener('click', (e) => { if (e.target === $('#sheet')) closeSheet(); });
}

function init() {
  initBackground($('#bg-canvas'), null);
  wireEvents();
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('/sw.js').catch(() => {}); } catch (e) {}
  }

  vault = loadVault();
  if (vault && vault.cipher) {
    showGate(renderUnlock);
  } else {
    showGate(renderWelcome);
  }
}

init();
