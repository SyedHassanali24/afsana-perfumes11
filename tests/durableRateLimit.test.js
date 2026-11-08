const test = require('node:test');
const assert = require('node:assert/strict');
const { hit } = require('../middleware/rateLimit');

test('rate limiter: durable SQLite counter blocks over-limit hits and resets at the window boundary', async () => {
  const rows = new Map();
  const storage = {
    sql: {
      exec(query, ...values) {
        if (query.includes('CREATE TABLE')) return { toArray: () => [] };
        if (query.includes('DELETE FROM')) {
          const cutoff = values[0];
          for (const [key, value] of rows) if (value.reset_at < cutoff) rows.delete(key);
          return { toArray: () => [] };
        }
        if (query.includes('INSERT INTO afsana_rate_limits')) {
          const [key, resetAt, now] = values;
          let row = rows.get(key);
          if (!row || row.reset_at <= now) row = { hit_count: 1, reset_at: resetAt };
          else row = { ...row, hit_count: row.hit_count + 1 };
          rows.set(key, row);
          return { toArray: () => [{ hit_count: row.hit_count }] };
        }
        throw new Error('Unexpected SQL in durable rate limiter test.');
      }
    }
  };

  assert.equal(await hit('test:login:203.0.113.10', 2, 1000, 1000, storage), true);
  assert.equal(await hit('test:login:203.0.113.10', 2, 1000, 1000, storage), true);
  assert.equal(await hit('test:login:203.0.113.10', 2, 1000, 1000, storage), false);
  assert.equal(await hit('test:login:203.0.113.10', 2, 1000, 2501, storage), true);
});

test('rate limiter: durable storage failure fails closed instead of dropping to memory', async () => {
  const storage = { sql: { exec() { throw new Error('storage offline'); } } };
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await hit('test:fail-closed:203.0.113.11', 10, 60000, 1000, storage), false);
  } finally {
    console.error = original;
  }
});
