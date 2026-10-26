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

test('health: inspectUri describes the connection string without revealing it', () => {
  const { inspectUri } = require('../netlify/functions/health');
  const good = inspectUri('mongodb+srv://user:Abc12345@cluster0.abc1234.mongodb.net/?retryWrites=true');
  assert.deepEqual([good.scheme, good.atSigns, good.hasSpaceOrNewline, good.passwordOnlyLettersAndNumbers, good.hostEndsWithMongodbNet, good.hostParts], ['mongodb+srv', 1, false, true, true, 4]);
  const bad = inspectUri('"mongodb+srv://user:p@ss@x.mongodb.net/ ');
  assert.equal(bad.atSigns, 2); assert.equal(bad.hasQuotes, true); assert.equal(bad.hasSpaceOrNewline, true);
  assert.equal(JSON.stringify(good).includes('Abc12345'), false);
  assert.equal(JSON.stringify(good).includes('cluster0'), false);
  assert.match(inspectUri('abc').scheme, /MISSING/);
});
