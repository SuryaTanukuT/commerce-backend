import path from 'path';
import dotenv from 'dotenv';

export function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: envPath });
}
