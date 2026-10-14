const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"

export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/

export function isShareId(value: string): boolean {
  return SHARE_ID_PATTERN.test(value)
}

export function createShareId(randomByte: () => number = randomByteFromCrypto): string {
  let id = ""
  for (let index = 0; index < 10; index += 1) {
    id += ALPHABET[randomByte() % ALPHABET.length]
  }
  return id
}

function randomByteFromCrypto(): number {
  const bytes = new Uint8Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] ?? 0
}
