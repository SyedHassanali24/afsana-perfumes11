const test = require('node:test');
const assert = require('node:assert/strict');
const { diagnoseDbError: d } = require('../services/healthDiagnose');

test('health: database errors become a plain cause and never echo secrets', () => {
  assert.equal(d(new Error('MONGODB_URI / MONGODB_DB_NAME not set')).code, 'ENV_MISSING');
  assert.equal(d(new Error('bad auth : authentication failed')).code, 'DB_AUTH');
  assert.equal(d(new Error('Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"')).code, 'URI_FORMAT');
  assert.equal(d(new Error('querySrv ENOTFOUND _mongodb._tcp.cluster0.abc.mongodb.net')).code, 'DNS');
  assert.equal(d(new Error('Server selection timed out after 8000 ms')).code, 'NETWORK');
  assert.equal(d(new Error('something odd')).code, 'DB_OTHER');
  const hint = JSON.stringify(d(new Error('mongodb+srv://user:SECRETPASS@host bad auth')));
  assert.equal(hint.includes('SECRETPASS'), false);
});
