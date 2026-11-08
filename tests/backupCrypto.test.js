const test = require('node:test');
const assert = require('node:assert/strict');
const { isEncryptedBackup, encryptBackupBuffer, decryptBackupBuffer } = require('../database/seed/backupCrypto.cjs');

test('encrypted backup: encrypts AFSANA records and decrypts with the correct passphrase', () => {
  const plain = Buffer.from(JSON.stringify({
    app: 'afsana-perfumes',
    version: 1,
    collections: { Product: [{ name: 'Private perfume catalog' }] },
    pictures: []
  }));
  const encrypted = encryptBackupBuffer(plain, 'correct horse battery staple');
  assert.equal(isEncryptedBackup(encrypted), true);
  assert.equal(encrypted.includes(Buffer.from('Private perfume catalog')), false);
  const restored = decryptBackupBuffer(encrypted, 'correct horse battery staple');
  assert.equal(restored.collections.Product[0].name, 'Private perfume catalog');
});

test('encrypted backup: rejects an incorrect passphrase', () => {
  const plain = Buffer.from(JSON.stringify({ app: 'afsana-perfumes', collections: {}, pictures: [] }));
  const encrypted = encryptBackupBuffer(plain, 'correct horse battery staple');
  assert.throws(() => decryptBackupBuffer(encrypted, 'wrong passphrase value'), /could not be decrypted/i);
});

test('encrypted backup: rejects modified ciphertext and malformed headers', () => {
  const plain = Buffer.from(JSON.stringify({ app: 'afsana-perfumes', collections: {}, pictures: [] }));
  const encrypted = encryptBackupBuffer(plain, 'correct horse battery staple');
  const tampered = Buffer.from(encrypted);
  tampered[tampered.length - 1] ^= 0xff;
  assert.throws(() => decryptBackupBuffer(tampered, 'correct horse battery staple'), /could not be decrypted/i);
  assert.throws(() => decryptBackupBuffer(Buffer.from('AFSANA-ENCRYPTED-BACKUP-V1\n\x00'), 'correct horse battery staple'), /header/i);
});

test('browser backup: WebCrypto export format restores with the Node restore helper', async () => {
  const { encryptBackupBlob } = await import('../admin/backup/backupCrypto.js');
  const plaintext = JSON.stringify({
    app: 'afsana-perfumes',
    version: 1,
    collections: { Customer: [{ name: 'Private customer' }] },
    pictures: []
  });
  const encryptedBlob = await encryptBackupBlob(new Blob([plaintext], { type: 'application/json' }), 'browser encryption passphrase');
  const encryptedBytes = Buffer.from(await encryptedBlob.arrayBuffer());
  const restored = decryptBackupBuffer(encryptedBytes, 'browser encryption passphrase');
  assert.equal(restored.collections.Customer[0].name, 'Private customer');
});
