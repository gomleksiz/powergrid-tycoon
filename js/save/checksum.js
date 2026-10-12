// FNV-1a 32-bit hash of a text. Returns an 8-digit hex string.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a(text) {
  let h = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

export function checksum(text) {
  return fnv1a(text).toString(16).padStart(8, '0');
}
