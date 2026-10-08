import * as Crypto from 'expo-crypto';

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';

/**
 * Apple puts the nonce we pass into the identity token. Supabase hashes the
 * raw nonce and compares it to that claim, so the button receives the SHA-256
 * hex digest and sign-in receives the raw value.
 */
export async function createAppleNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = Crypto.getRandomBytes(32);
  let raw = '';

  for (let index = 0; index < bytes.length; index += 1) {
    raw += CHARSET[bytes[index]! % CHARSET.length];
  }

  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}
