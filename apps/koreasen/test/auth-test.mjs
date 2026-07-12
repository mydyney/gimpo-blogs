import {
  PBKDF2_ITERATIONS, bytesToBase64Url, base64UrlToBytes,
  hashPassword, safeEqual, sessionCookie,
} from '../functions/_lib/auth.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const salt = crypto.getRandomValues(new Uint8Array(16));
const encodedSalt = bytesToBase64Url(salt);
assert(Buffer.from(base64UrlToBytes(encodedSalt)).equals(Buffer.from(salt)), 'salt encoding');
const hash = await hashPassword('securePass123', salt, PBKDF2_ITERATIONS);
const same = await hashPassword('securePass123', salt, PBKDF2_ITERATIONS);
const other = await hashPassword('differentPass123', salt, PBKDF2_ITERATIONS);
assert(safeEqual(hash, same), 'same password mismatch');
assert(!safeEqual(hash, other), 'different password accepted');
assert(!hash.includes('securePass123'), 'plaintext exposed');
const cookie = sessionCookie(new Request('https://mytokyomate.com/api/auth/login'), 'token', 3600);
assert(/HttpOnly/.test(cookie) && /Secure/.test(cookie) && /SameSite=Strict/.test(cookie), 'secure cookie flags');
console.log('PASS auth primitives: PBKDF2, salt encoding, constant-time compare, secure cookie');
