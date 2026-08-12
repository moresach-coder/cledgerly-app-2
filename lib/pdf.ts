/** Thrown when a PDF is encrypted and the supplied password was missing or wrong. */
export class PdfPasswordRequired extends Error {
  constructor(public readonly wrongPassword: boolean) {
    super(wrongPassword ? 'Incorrect statement password' : 'Statement is password protected');
    this.name = 'PdfPasswordRequired';
  }
}

/**
 * Extracts text from a PDF, decrypting first when a password is supplied.
 *
 * Bank statements are commonly encrypted with a per-institution pattern that does not
 * change between months, which is what makes storing one password per institution
 * workable (see lib/secrets.ts).
 */
export async function extractPdfText(buf: Buffer, password?: string): Promise<string> {
  const { PDFParse, PasswordException } = await import('pdf-parse');
  const parser = new PDFParse({
    data: new Uint8Array(buf),
    ...(password ? { password } : {}),
  });

  try {
    const result = await parser.getText();
    return result.text || '';
  } catch (e: any) {
    if (e instanceof PasswordException || e?.name === 'PasswordException') {
      // pdf.js uses code 1 for "need password", 2 for "supplied password is wrong".
      throw new PdfPasswordRequired(e?.code === 2 || Boolean(password));
    }
    throw e;
  } finally {
    await parser.destroy().catch(() => {});
  }
}
