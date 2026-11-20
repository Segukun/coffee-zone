import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve backend/.env independently of the working directory; preserve injected variables.
dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
