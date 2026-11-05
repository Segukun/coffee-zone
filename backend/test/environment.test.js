import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

test('dotenv resolves backend/.env independently of the working directory and preserves injected variables', async (context) => {
  const previousDirectory = process.cwd();
  const configMock = context.mock.method(dotenv, 'config', () => ({ parsed: {} }));
  try {
    process.chdir(tmpdir());
    await import('../src/config/environment.js');
    assert.equal(configMock.mock.callCount(), 1);
    const [options] = configMock.mock.calls[0].arguments;
    assert.equal(options.path, fileURLToPath(new URL('../.env', import.meta.url)));
    assert.equal(options.quiet, true);
    assert.notEqual(options.override, true);
  } finally {
    process.chdir(previousDirectory);
  }
});
