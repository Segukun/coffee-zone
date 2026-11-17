import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

export function configureAuth(context) {
  const previous = { JWT_SECRET: process.env.JWT_SECRET, JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN, BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS };
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.BCRYPT_ROUNDS = '10';
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

export function mockUserQuery(context, method, result) {
  return context.mock.method(User, method, () => {
    const query = new mongoose.Query();
    context.mock.method(query, 'exec', async () => typeof result === 'function' ? result() : result);
    return query;
  });
}

export async function serve(application) {
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

export async function post(url, path, input) {
  const response = await fetch(url + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  return { response, body: await response.json() };
}
