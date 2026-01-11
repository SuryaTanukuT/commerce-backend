import path from 'path';
import dotenv from 'dotenv';

/**
 * Loads the ROOT .env file from repo root.
 * Each service is executed from its own folder, so we load: ../../.env
 *
 * This ensures a single config file for the whole platform.
 */
export function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: envPath });
}
