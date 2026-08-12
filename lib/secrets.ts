import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

/**
 * Secret storage backed by the macOS Keychain.
 *
 * Nothing sensitive is written to ledgerly.db or to disk in this project — the IMAP app
 * password and each institution's statement password live in the OS keychain, protected
 * by the login keychain and readable only by this user. The database stores only
 * non-secret metadata (which institutions have a password on file, and a reminder of
 * what the pattern is).
 *
 * Values are passed via execFile argument arrays, never through a shell, so a password
 * containing quotes or $ cannot be interpreted.
 */

const SERVICE_PREFIX = 'ledgerly';

function serviceName(kind: 'imap' | 'statement', key: string) {
  return `${SERVICE_PREFIX}.${kind}.${key.toLowerCase()}`;
}

export function secretsAvailable(): boolean {
  return process.platform === 'darwin';
}

export async function setSecret(kind: 'imap' | 'statement', key: string, value: string): Promise<void> {
  if (!secretsAvailable()) throw new Error('Keychain storage is only available on macOS');
  // -U updates in place when an entry already exists.
  await run('security', [
    'add-generic-password',
    '-a', key,
    '-s', serviceName(kind, key),
    '-w', value,
    '-U',
  ]);
}

export async function getSecret(kind: 'imap' | 'statement', key: string): Promise<string | null> {
  if (!secretsAvailable()) return null;
  try {
    const { stdout } = await run('security', [
      'find-generic-password',
      '-a', key,
      '-s', serviceName(kind, key),
      '-w',
    ]);
    return stdout.replace(/\n$/, '');
  } catch {
    return null; // not found
  }
}

export async function deleteSecret(kind: 'imap' | 'statement', key: string): Promise<void> {
  if (!secretsAvailable()) return;
  try {
    await run('security', ['delete-generic-password', '-a', key, '-s', serviceName(kind, key)]);
  } catch {
    /* already absent */
  }
}

export async function hasSecret(kind: 'imap' | 'statement', key: string): Promise<boolean> {
  return (await getSecret(kind, key)) !== null;
}
