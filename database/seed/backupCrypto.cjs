'use strict';

const crypto = require('crypto');

const MAGIC = Buffer.from('AFSANA-ENCRYPTED-BACKUP-V1\n', 'utf8');
const ITERATIONS = 310000;
const MIN_ITERATIONS = 100000;
const MAX_ITERATIONS = 1000000;

function isEncryptedBackup(input) {
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  return data.length >= MAGIC.length && data.subarray(0, MAGIC.length).equals(MAGIC);
}

function decryptBackupBuffer(input, passphrase) {
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  if (!isEncryptedBackup(data)) throw new Error('This file is not an encrypted AFSANA backup.');
  if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('Backup passphrase must contain at least 12 characters.');

  const offset = MAGIC.length;
  if (data.length < offset + 4) throw new Error('Encrypted backup header is incomplete.');
  const headerLength = data.readUInt32BE(offset);
  if (!Number.isInteger(headerLength) || headerLength < 2 || headerLength > 4096 || data.length < offset + 4 + headerLength + 16) {
    throw new Error('Encrypted backup header is invalid.');
  }

  let header;
  try { header = JSON.parse(data.subarray(offset + 4, offset + 4 + headerLength).toString('utf8')); }
  catch { throw new Error('Encrypted backup header could not be read.'); }

  if (header?.app !== 'afsana-perfumes' || header?.format !== 'encrypted-v1' ||
      header?.kdf !== 'PBKDF2-SHA256' || header?.cipher !== 'AES-256-GCM') {
    throw new Error('Encrypted backup format is not supported.');
  }
  const iterations = Number(header.iterations);
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error('Encrypted backup key-derivation settings are invalid.');
  }
  if (!/^[a-f0-9]{32}$/i.test(String(header.salt || '')) || !/^[a-f0-9]{24}$/i.test(String(header.iv || ''))) {
    throw new Error('Encrypted backup cryptographic header is invalid.');
  }

  const ciphertext = data.subarray(offset + 4 + headerLength);
  if (ciphertext.length < 16) throw new Error('Encrypted backup payload is incomplete.');
  const salt = Buffer.from(header.salt, 'hex');
  const iv = Buffer.from(header.iv, 'hex');
  const tag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  try {
    const key = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const backup = JSON.parse(plaintext.toString('utf8'));
    if (backup?.app !== 'afsana-perfumes' || !backup.collections || typeof backup.collections !== 'object') {
      throw new Error('Decrypted file is not a valid AFSANA backup.');
    }
    return backup;
  } catch (error) {
    if (error.message === 'Decrypted file is not a valid AFSANA backup.') throw error;
    throw new Error('Backup could not be decrypted. Check the passphrase or file integrity.');
  }
}

function encryptBackupBuffer(input, passphrase, { salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), iterations = ITERATIONS } = {}) {
  if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('Backup passphrase must contain at least 12 characters.');
  const plaintext = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const key = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.from(JSON.stringify({
    app: 'afsana-perfumes',
    format: 'encrypted-v1',
    kdf: 'PBKDF2-SHA256',
    iterations,
    cipher: 'AES-256-GCM',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
  }), 'utf8');
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(header.length, 0);
  return Buffer.concat([MAGIC, prefix, header, encrypted]);
}

module.exports = { MAGIC, ITERATIONS, isEncryptedBackup, encryptBackupBuffer, decryptBackupBuffer };
