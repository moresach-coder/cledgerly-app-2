import { NextRequest, NextResponse } from 'next/server';
import { extractPdfText, PdfPasswordRequired } from '@/lib/pdf';
import { getSecret } from '@/lib/secrets';
import { listInstitutionSecrets, recordInstitutionSecret } from '@/lib/emailRepo';
import { setSecret } from '@/lib/secrets';
import { detectAccount, accountSuggestions } from '@/lib/detectAccount';

// better-sqlite3 and pdf-parse are native/CJS — keep this route on the Node runtime.
export const runtime = 'nodejs';

/** Turns a sheet row into one "date, narration, amount" line the existing parser understands. */
function rowToLine(row: unknown[]): string | null {
  const cells = row.map((c) => (c == null ? '' : String(c).trim())).filter(Boolean);
  if (cells.length < 2) return null;
  return cells.join(', ');
}

async function extractFromSpreadsheet(buf: Buffer): Promise<string> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, raw: false });
  const out: string[] = [];

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false });
    for (const row of rows) {
      const line = rowToLine(row as unknown[]);
      if (line) out.push(line);
    }
  }
  return out.join('\n');
}

/**
 * Reads an encrypted statement without making the user retype a password they have
 * already given us: an explicit password wins, otherwise every institution password on
 * file is tried, since the uploaded file does not say which bank it came from.
 * Returns the password that worked so the caller can offer to remember it.
 */
async function extractFromPdf(
  buf: Buffer,
  explicit?: string
): Promise<{ text: string; usedPassword?: string }> {
  if (explicit) return { text: await extractPdfText(buf, explicit), usedPassword: explicit };

  try {
    return { text: await extractPdfText(buf) };
  } catch (e) {
    if (!(e instanceof PdfPasswordRequired)) throw e;
  }

  for (const { institution } of await listInstitutionSecrets()) {
    const stored = await getSecret('statement', institution);
    if (!stored) continue;
    try {
      return { text: await extractPdfText(buf, stored), usedPassword: stored };
    } catch (e) {
      if (!(e instanceof PdfPasswordRequired)) throw e;
    }
  }

  throw new PdfPasswordRequired(false);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    const name = (file as File).name || 'statement';
    const ext = name.toLowerCase().split('.').pop() || '';
    const buf = Buffer.from(await (file as File).arrayBuffer());

    const password = (form.get('password') as string | null) || undefined;
    const rememberFor = (form.get('rememberFor') as string | null) || undefined;

    let text = '';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm' || ext === 'csv') {
      text = await extractFromSpreadsheet(buf);
    } else if (ext === 'pdf') {
      const r = await extractFromPdf(buf, password);
      text = r.text;
      // Only after the password has actually decrypted the file do we offer to keep it.
      if (rememberFor && r.usedPassword) {
        await setSecret('statement', rememberFor.toLowerCase(), r.usedPassword);
        await recordInstitutionSecret(rememberFor, 'Saved from a statement upload');
      }
    } else if (ext === 'txt' || ext === 'tsv') {
      text = buf.toString('utf8');
    } else {
      return NextResponse.json(
        { error: `Unsupported file type ".${ext}". Upload an Excel, CSV or PDF statement.` },
        { status: 400 }
      );
    }

    const lineCount = text.split('\n').filter((l) => l.trim()).length;
    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            ext === 'pdf'
              ? 'No text found in that PDF. Scanned or image-only statements cannot be read — export an Excel or CSV from your bank instead.'
              : 'That file appears to be empty.',
        },
        { status: 400 }
      );
    }

    // Work out the account from the statement itself so the user does not have to type it.
    const guess = await detectAccount(text);
    return NextResponse.json({
      text,
      fileName: name,
      lineCount,
      account: guess.account,
      accountKnown: guess.known,
      detectedIssuer: guess.issuer,
      detectedLast4: guess.last4,
      suggestions: await accountSuggestions(),
    });
  } catch (e) {
    // A locked statement is a prompt, not a failure — the UI asks for the password and retries.
    if (e instanceof PdfPasswordRequired) {
      return NextResponse.json(
        {
          needsPassword: true,
          wrongPassword: e.wrongPassword,
          error: e.wrongPassword
            ? 'That password did not open the statement. Check it and try again.'
            : 'This statement is password protected. Enter the password your bank uses.',
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: `Could not read that file: ${String(e)}` }, { status: 500 });
  }
}
