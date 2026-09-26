import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import test, { before, after } from 'node:test';
import { createQuoteServer, MAX_BODY_BYTES } from '../src/server.js';

let server;
let port;
before(async () => {
  server = createQuoteServer({ buildCommit: '1234567890abcdef' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function send({ path = '/quotes', method = 'POST', body, type = 'application/json', chunks } = {}) {
  return new Promise((resolve, reject) => {
    const headers = type === undefined ? {} : { 'Content-Type': type };
    const req = request({ hostname: '127.0.0.1', port, path, method, headers, agent: false }, (res) => {
      const parts = [];
      res.on('data', (chunk) => parts.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(Buffer.concat(parts)) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    for (const chunk of chunks || []) req.write(chunk);
    req.end(body);
  });
}

test('health and version expose the delivery contract', async () => {
  const health = await send({ path: '/healthz', method: 'GET' });
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok' });
  const version = await send({ path: '/version', method: 'GET' });
  assert.equal(version.status, 200);
  assert.deepEqual(version.body, { name: 'quotes-node', version: '1.0.0', buildCommit: '1234567890abcdef' });
});

test('the legitimate reference quote has the exact expected value', async () => {
  const response = await send({ body: '{"insuredAmountCents":100000,"coverage":"basic"}' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { currency: 'EUR', premiumCents: 1000, tariffVersion: 'demo-v1' });
  assert.match(response.headers['content-type'], /^application\/json/);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});

test('extended tariff, inclusive bounds and charset parameter', async () => {
  for (const [amount, expected] of [[100, 2], [101, 3], [100000000, 2000000]]) {
    const response = await send({ type: 'application/json; charset=utf-8', body: JSON.stringify({ insuredAmountCents: amount, coverage: 'extended' }) });
    assert.equal(response.status, 200);
    assert.equal(response.body.premiumCents, expected);
  }
});

test('invalid domain inputs return 400 rather than a quote', async () => {
  for (const input of [{}, null, [], { insuredAmountCents: 99, coverage: 'basic' },
    { insuredAmountCents: 100000001, coverage: 'basic' }, { insuredAmountCents: 100.5, coverage: 'basic' },
    { insuredAmountCents: -100, coverage: 'basic' }, { insuredAmountCents: 100, coverage: 'other' }]) {
    const response = await send({ body: JSON.stringify(input) });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'INVALID_REQUEST');
  }
});

test('malformed, empty and invalid UTF-8 JSON return 400', async () => {
  for (const body of ['{broken}', '', '{"insuredAmountCents":', Buffer.from([0xff, 0xfe])]) {
    const response = await send({ body });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'INVALID_JSON');
  }
});

test('body size is enforced in bytes, including chunked requests', async () => {
  for (const input of [{ body: ' '.repeat(MAX_BODY_BYTES + 1) }, { chunks: [' '.repeat(MAX_BODY_BYTES), ' '] }]) {
    const response = await send(input);
    assert.equal(response.status, 413);
    assert.equal(response.body.code, 'BODY_TOO_LARGE');
  }
  const json = '{"insuredAmountCents":100,"coverage":"basic"}';
  const response = await send({ body: json.padEnd(MAX_BODY_BYTES, ' ') });
  assert.equal(response.status, 200);
});

test('route, method and media type errors have distinct statuses', async () => {
  const absent = await send({ path: '/missing', method: 'GET' });
  assert.equal(absent.status, 404);
  for (const [path, method, allowed] of [['/quotes', 'GET', 'POST'], ['/healthz', 'POST', 'GET'], ['/version', 'POST', 'GET']]) {
    const response = await send({ path, method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, allowed);
  }
  const wrongType = await send({ type: 'text/plain', body: '{}' });
  assert.equal(wrongType.status, 415);
  assert.equal(wrongType.body.code, 'UNSUPPORTED_MEDIA_TYPE');
});
