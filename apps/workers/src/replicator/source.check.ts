import assert from 'node:assert/strict';
import { buildSourceQuery, stripSensitive } from './source.js';

const q = buildSourceQuery({ name: 'setup', cursorCol: 'last_acted_at' }, '2026-01-01', 500);
assert.equal(
  q.sql,
  'SELECT * FROM "setup" WHERE "last_acted_at" > $1 ORDER BY "last_acted_at" ASC LIMIT $2',
);
assert.deepEqual(q.params, ['2026-01-01', 500]);

const snap = buildSourceQuery({ name: 'trader_stats', cursorCol: null }, undefined, 2000);
assert.equal(snap.sql, 'SELECT * FROM "trader_stats" LIMIT $1');
assert.deepEqual(snap.params, [2000]);

const stripped = stripSensitive({
  id: '1',
  hashed_password: 'secret',
  Hashed_Password: 'also',
  name: 'ok',
});
assert.deepEqual(stripped, { id: '1', name: 'ok' });

console.log('source.check ok');
