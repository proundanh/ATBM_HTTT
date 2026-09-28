import { ed25519 } from '@noble/curves/ed25519.js';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Converts a Uint8Array to a Base64-encoded string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64-encoded string to a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const cleanBase64 = base64.trim();
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: length must be even');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`Invalid hex byte at index ${i}: "${cleanHex.slice(i, i + 2)}"`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a lowercase hexadecimal string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes the SHA-256 hash of a Uint8Array and returns a 64-character lowercase hex string.
 */
export async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Generates an Ed25519 key pair (32 bytes each), returned as Base64 strings.
 */
export function generateKeyPair(): KeyPair {
  const { secretKey, publicKey } = ed25519.keygen();
  return {
    privateKey: bytesToBase64(secretKey),
    publicKey: bytesToBase64(publicKey),
  };
}

/**
 * Derives the Ed25519 Public Key (Base64) from an existing Private Key (Base64).
 */
export function getPublicKeyFromPrivate(privateKeyBase64: string): string {
  const privateKeyBytes = base64ToBytes(privateKeyBase64);
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}`);
  }
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return bytesToBase64(publicKeyBytes);
}

/**
 * Signs a SHA-256 hash (in hex string format) using an Ed25519 private key (Base64).
 * Returns a 64-byte signature encoded as Base64.
 */
export function signHash(hashHex: string, privateKeyBase64: string): string {
  const hashBytes = hexToBytes(hashHex);
  if (hashBytes.length !== 32) {
    throw new Error(`Invalid SHA-256 hash length: expected 32 bytes, got ${hashBytes.length}`);
  }
  const privateKeyBytes = base64ToBytes(privateKeyBase64);
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}`);
  }
  const signatureBytes = ed25519.sign(hashBytes, privateKeyBytes);
  return bytesToBase64(signatureBytes);
}

/**
 * Verifies an Ed25519 signature (Base64) against a SHA-256 hash (hex) and public key (Base64).
 * Returns true if valid, false otherwise.
 */
export function verifySignature(
  hashHex: string,
  signatureBase64: string,
  publicKeyBase64: string
): boolean {
  try {
    const hashBytes = hexToBytes(hashHex);
    if (hashBytes.length !== 32) {
      return false;
    }
    const signatureBytes = base64ToBytes(signatureBase64);
    if (signatureBytes.length !== 64) {
      return false;
    }
    const publicKeyBytes = base64ToBytes(publicKeyBase64);
    if (publicKeyBytes.length !== 32) {
      return false;
    }
    return ed25519.verify(signatureBytes, hashBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
