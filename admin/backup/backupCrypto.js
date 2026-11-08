const MAGIC = 'AFSANA-ENCRYPTED-BACKUP-V1\n';
const ITERATIONS = 310000;

const toHex = (bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

export async function encryptBackupBlob(blob, passphrase) {
  if (!(blob instanceof Blob)) throw new Error('Backup data is unavailable.');
  if (typeof passphrase !== 'string' || passphrase.length < 12) {
    throw new Error('Choose a backup passphrase with at least 12 characters.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    await blob.arrayBuffer(),
  ));

  const header = new TextEncoder().encode(JSON.stringify({
    app: 'afsana-perfumes',
    format: 'encrypted-v1',
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: toHex(salt),
    iv: toHex(iv),
  }));
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, header.length, false);
  return new Blob([new TextEncoder().encode(MAGIC), prefix, header, encrypted], {
    type: 'application/octet-stream',
  });
}
