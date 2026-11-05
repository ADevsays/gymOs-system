import { sqlite } from '../lib/db';

export function getGymConfig(key: string): string | null {
  try {
    const row = sqlite.prepare('SELECT value FROM gym_config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function setGymConfig(key: string, value: string): void {
  try {
    sqlite.prepare('INSERT OR REPLACE INTO gym_config (key, value) VALUES (?, ?)').run(key, value);
  } catch (err) {
    console.error('Error setting gym_config:', err);
  }
}

import crypto from 'crypto';

const DEFAULT_RELAY_URL = 'https://gym-os-cam.vercel.app';
const DEFAULT_SECRET_KEY = 'b3aeda29734a19399f938b9512ec4bac58959595f37d94c1d6762774c98f891b';

export function getRelayUrl(): string | null {
  const envUrl = process.env.GYMOS_RELAY_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const configUrl = getGymConfig('relay_url')?.trim();
  if (configUrl) return configUrl.replace(/\/+$/, '');
  return DEFAULT_RELAY_URL;
}

export function getRelaySecretKey(): string {
  const envSecret = process.env.GYMOS_SECRET_KEY?.trim();
  if (envSecret) return envSecret;
  const dbSecret = getGymConfig('secret_key')?.trim();
  if (dbSecret) return dbSecret;
  return DEFAULT_SECRET_KEY;
}

export function signCamSession(session: string, exp: number): string {
  const secret = getRelaySecretKey();
  return crypto.createHmac('sha256', secret).update(`${session}:${exp}`).digest('hex');
}


