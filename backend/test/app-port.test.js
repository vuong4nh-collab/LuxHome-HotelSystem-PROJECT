const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');

const { getAvailablePort } = require('../src/app');

test('getAvailablePort skips occupied ports and chooses the next free port', async () => {
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(5000, '0.0.0.0', resolve));

  try {
    const port = await getAvailablePort(5000, 5);
    assert.notEqual(port, 5000);
    assert.ok(port >= 5001 && port <= 5005);
  } finally {
    await new Promise((resolve, reject) => blocker.close((err) => (err ? reject(err) : resolve())));
  }
});
