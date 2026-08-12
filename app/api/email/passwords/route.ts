import { NextRequest, NextResponse } from 'next/server';
import { listInstitutionSecrets, recordInstitutionSecret, forgetInstitutionSecret, clearBlocked } from '@/lib/emailRepo';
import { setSecret, deleteSecret, hasSecret, secretsAvailable } from '@/lib/secrets';

export const runtime = 'nodejs';

/**
 * Statement passwords, one per institution.
 *
 * Issuers use a fixed pattern per customer (date of birth, PAN, name fragment) that does
 * not change month to month, so the password is entered once and reused for every future
 * statement from that institution. Only a non-secret hint is stored in the database; the
 * password itself lives in the OS keychain.
 */
export async function GET() {
  const rows = await listInstitutionSecrets();
  const withState = await Promise.all(
    rows.map(async (r) => ({ ...r, stored: await hasSecret('statement', r.institution) }))
  );
  return NextResponse.json({ institutions: withState, keychainAvailable: secretsAvailable() });
}

export async function POST(req: NextRequest) {
  try {
    const { institution, password, hint } = await req.json();
    if (!institution || !password) {
      return NextResponse.json({ error: 'institution and password are required' }, { status: 400 });
    }
    if (!secretsAvailable()) {
      return NextResponse.json({ error: 'Keychain storage requires macOS' }, { status: 400 });
    }

    await setSecret('statement', String(institution).toLowerCase(), password);
    await recordInstitutionSecret(institution, hint || '');

    // Let statements that were parked for a missing password be retried on next sync.
    await clearBlocked('needs_password');

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { institution } = await req.json();
  if (institution) {
    await deleteSecret('statement', String(institution).toLowerCase());
    await forgetInstitutionSecret(institution);
  }
  return NextResponse.json({ ok: true });
}
