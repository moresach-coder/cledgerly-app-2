import { NextRequest, NextResponse } from 'next/server';
import { listEmailAccounts, upsertEmailAccount, deleteEmailAccount } from '@/lib/emailRepo';
import { setSecret, deleteSecret, hasSecret, secretsAvailable } from '@/lib/secrets';
import { testConnection } from '@/lib/emailSync';

export const runtime = 'nodejs';

export async function GET() {
  const accounts = await Promise.all(
    (await listEmailAccounts()).map(async (a) => ({ ...a, hasPassword: await hasSecret('imap', a.email) }))
  );
  return NextResponse.json({ accounts, keychainAvailable: secretsAvailable() });
}

/**
 * Saves a mailbox and its app password. The password goes straight to the OS keychain and
 * is never written to the database or echoed back in any response.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, host, port, mailbox, password } = await req.json();
    if (!email || !host || !password) {
      return NextResponse.json({ error: 'email, host and password are required' }, { status: 400 });
    }
    if (!secretsAvailable()) {
      return NextResponse.json({ error: 'Keychain storage requires macOS' }, { status: 400 });
    }

    const portNum = Number(port) || 993;
    try {
      await testConnection(email, host, portNum, password);
    } catch (e) {
      return NextResponse.json(
        { error: `Could not sign in: ${String(e).replace(/\s+/g, ' ').slice(0, 200)}` },
        { status: 400 }
      );
    }

    await setSecret('imap', email, password);
    const account = await upsertEmailAccount(email, host, portNum, mailbox || 'INBOX');
    return NextResponse.json({ account });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id, email } = await req.json();
  if (email) await deleteSecret('imap', email);
  if (id) await deleteEmailAccount(id);
  return NextResponse.json({ ok: true });
}
