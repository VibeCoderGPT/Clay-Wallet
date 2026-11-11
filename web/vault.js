// =====================================================================
//  vault.js — password-encrypted local storage for the wallet secret.
//  The mnemonic / private key never leaves this browser and is only ever
//  held in memory while unlocked. Uses WebCrypto PBKDF2 + AES-GCM.
// =====================================================================

const VAULT_KEY = 'clay-wallet-vault-v1';

export function loadVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
export function saveVault(vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}
export function clearVault() {
  localStorage.removeItem(VAULT_KEY);
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function deriveKey(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSecret(secret, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, 210000);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(secret)
  );
  return { salt: b64(salt), iv: b64(iv), data: b64(data), iter: 210000 };
}

export async function decryptSecret(cipher, password) {
  const key = await deriveKey(password, unb64(cipher.salt), cipher.iter || 210000);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(cipher.iv) }, key, unb64(cipher.data)
  );
  return new TextDecoder().decode(plain);
}
