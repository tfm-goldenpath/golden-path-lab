import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../src/server.js';
test('HTTP health, committed version, application response and unknown routes', async () => {
  const commit = '1234567890abcdef1234567890abcdef12345678';
  const server = createServer(commit);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    assert.deepEqual(await (await fetch(url + '/healthz')).json(), {status: 'ok'});
    assert.deepEqual(await (await fetch(url + '/version')).json(), {name: 'independent-node', buildCommit: commit});
    assert.deepEqual(await (await fetch(url)).json(), {message: 'Hello from the independent consumer'});
    assert.equal((await fetch(url + '/missing')).status, 404);
    assert.equal((await fetch(url, {method: 'POST'})).status, 404);
  } finally {await new Promise(resolve => server.close(resolve));}
});
