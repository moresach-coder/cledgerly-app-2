// Physical-card visual identity.
//
// Goal: a card in this app should be recognisable at a glance as the same physical
// card in your wallet — same colour, same material, same layout of wordmark / network
// / chip / name. Colours, textures and layout are reproduced; issuer identification is
// rendered as plain text wordmarks rather than copies of trademarked logo artwork.

export type CardTexture = 'guilloche' | 'brushed' | 'chevron' | 'waves' | 'sheen' | 'facet';

export interface CardTheme {
  id: string;
  from: string;
  via: string;
  to: string;
  texture: CardTexture;
  light?: boolean; // pale card → dark ink
  chip?: 'gold' | 'silver';
  accent?: string; // wordmark tint (e.g. Bonvoy gold)
}

const THEMES: Record<string, CardTheme> = {
  // Amex Platinum / Travel: near-white pearlescent steel, guilloche engraving, medallion.
  amexPearl: { id: 'amexPearl', from: '#F7F8F9', via: '#E6E8EB', to: '#C3C7CD', texture: 'guilloche', light: true, chip: 'silver' },
  // Amazon Pay ICICI: dark warm charcoal washing into bronze towards the right.
  amazonBronze: { id: 'amazonBronze', from: '#2B2A29', via: '#413A34', to: '#6E5B42', texture: 'brushed', chip: 'silver' },
  // ICICI Sapphiro: navy-to-blue with faceted gem geometry.
  sapphiro: { id: 'sapphiro', from: '#101A38', via: '#24386F', to: '#4462A6', texture: 'facet', chip: 'gold' },
  // Generic black metal card.
  blackMetal: { id: 'blackMetal', from: '#141414', via: '#1E1E1E', to: '#2B2B2B', texture: 'brushed', chip: 'silver' },
  // Premium co-brand (Bonvoy / Infinia / Magnus): true black + gold chip and wordmark.
  blackGold: { id: 'blackGold', from: '#000000', via: '#0B0B0B', to: '#151515', texture: 'sheen', chip: 'gold', accent: '#C9A227' },
  // Axis: magenta-crimson with large geometric chevrons.
  axisMagenta: { id: 'axisMagenta', from: '#8E0E3A', via: '#A70D42', to: '#C1094B', texture: 'chevron', chip: 'silver' },
  // HDFC: deep violet with soft wave watermark.
  hdfcViolet: { id: 'hdfcViolet', from: '#2A1147', via: '#3A1A5E', to: '#4B2277', texture: 'waves', chip: 'gold' },
  icici: { id: 'icici', from: '#5A2A12', via: '#77391A', to: '#8E4A22', texture: 'sheen', chip: 'gold' },
  sbiNavy: { id: 'sbiNavy', from: '#0D1B33', via: '#14294D', to: '#1D3B6B', texture: 'sheen', chip: 'gold' },
  kotakMaroon: { id: 'kotakMaroon', from: '#3A0E17', via: '#551523', to: '#701D2F', texture: 'sheen', chip: 'gold' },
  // Bank accounts (no physical card) — neutral graphite.
  graphite: { id: 'graphite', from: '#15171B', via: '#252830', to: '#383C46', texture: 'brushed', chip: 'silver' },
};

// Order matters: co-brands and named variants must win over their parent issuer, because
// one bank ships very differently coloured cards (ICICI Sapphiro is blue, Amazon Pay ICICI
// is charcoal/bronze, a plain ICICI account is neither).
const BRAND_RULES: [RegExp, keyof typeof THEMES][] = [
  [/amazon\s*pay/i, 'amazonBronze'],
  [/sapphiro|coral|rubyx|emeralde/i, 'sapphiro'],
  [/bonvoy|marriott|infinia|magnus|centurion|world\s*elite|regalia/i, 'blackGold'],
  [/amex|american\s*express/i, 'amexPearl'],
  [/axis/i, 'axisMagenta'],
  [/hdfc/i, 'hdfcViolet'],
  [/icici/i, 'icici'],
  [/sbi|state\s*bank/i, 'sbiNavy'],
  [/kotak/i, 'kotakMaroon'],
];

export function themeFor(account: string): CardTheme {
  // A savings/current account has no physical card, so there is no real colour to copy —
  // picking one from the issuer's brand invents a card that does not exist. Bank accounts
  // get a neutral graphite slab and are identified by their logo badge instead.
  if (accountKind(account) === 'bank') return THEMES.graphite;

  for (const [re, key] of BRAND_RULES) if (re.test(account)) return THEMES[key];
  return THEMES.blackMetal;
}

/** Back-compat alias — older call sites use gradientFor for small avatar swatches. */
export const gradientFor = themeFor;

const CREDIT_HINTS = /card|credit|amex|visa|master|rupay|platinum|infinia|regalia|magnus|millennia|amazon\s*pay|diners|bonvoy/i;
const BANK_HINTS = /bank\s*a\/?c|savings|current|checking/i;

export function accountKind(account: string): 'credit_card' | 'bank' {
  if (BANK_HINTS.test(account)) return 'bank';
  if (CREDIT_HINTS.test(account)) return 'credit_card';
  return /bank/i.test(account) ? 'bank' : 'credit_card';
}

/** The issuer line printed at the top-left of a real card. */
export function issuerOf(account: string): string {
  const map: [RegExp, string][] = [
    [/amex|american\s*express/i, 'AMERICAN EXPRESS'],
    [/amazon\s*pay/i, 'amazon pay'],
    [/bonvoy|marriott/i, 'MARRIOTT BONVOY'],
    [/hdfc/i, 'HDFC BANK'],
    [/icici/i, 'ICICI BANK'],
    [/axis/i, 'AXIS BANK'],
    [/sbi|state\s*bank/i, 'SBI CARD'],
    [/kotak/i, 'KOTAK'],
    [/idfc/i, 'IDFC FIRST'],
    [/yes\s*bank/i, 'YES BANK'],
    [/indusind/i, 'INDUSIND BANK'],
  ];
  for (const [re, label] of map) if (re.test(account)) return label;
  return account.trim().split(/\s+/)[0].toUpperCase();
}

/** The product/variant line, printed where the cardholder name sits on a real card. */
export function productOf(account: string): string {
  const stripped = account
    .replace(/amex|american\s*express|amazon\s*pay|marriott|hdfc|icici|axis|sbi|state\s*bank|kotak|idfc\s*first|idfc|yes\s*bank|indusind/gi, ' ')
    .replace(/\bbank\b|\bcard\b|\bcredit\b|\ba\/?c\b|\baccount\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped) return stripped.toUpperCase();
  return accountKind(account) === 'credit_card' ? 'CREDIT CARD' : 'SAVINGS';
}

/**
 * File-name stem for an issuer's logo under /public/brands.
 * Drop e.g. `public/brands/amex.svg` and it is picked up automatically; until then the
 * text badge is shown instead. See public/brands/README.md.
 */
export function brandSlug(account: string): string {
  const map: [RegExp, string][] = [
    [/amazon\s*pay/i, 'amazonpay'],
    [/amex|american\s*express/i, 'amex'],
    [/bonvoy|marriott/i, 'bonvoy'],
    [/hdfc/i, 'hdfc'],
    [/icici/i, 'icici'],
    [/axis/i, 'axis'],
    [/sbi|state\s*bank/i, 'sbi'],
    [/kotak/i, 'kotak'],
    [/idfc/i, 'idfc'],
    [/yes\s*bank/i, 'yesbank'],
    [/indusind/i, 'indusind'],
  ];
  for (const [re, slug] of map) if (re.test(account)) return slug;
  return 'unknown';
}

/** Short identifier for the small brand badge shown in lists. */
export function shortMarkOf(account: string): string {
  const map: [RegExp, string][] = [
    [/amex|american\s*express/i, 'AMEX'],
    [/amazon\s*pay/i, 'aPay'],
    [/bonvoy|marriott/i, 'MB'],
    [/hdfc/i, 'HDFC'],
    [/icici/i, 'ICICI'],
    [/axis/i, 'AXIS'],
    [/sbi|state\s*bank/i, 'SBI'],
    [/kotak/i, 'KTK'],
    [/idfc/i, 'IDFC'],
    [/yes\s*bank/i, 'YES'],
    [/indusind/i, 'INDS'],
  ];
  for (const [re, label] of map) if (re.test(account)) return label;
  return initials(account);
}

/** Payment network shown as a small mark, when the name makes it unambiguous. */
export function networkOf(account: string): string | null {
  if (/amex|american\s*express/i.test(account)) return 'AMEX';
  if (/rupay/i.test(account)) return 'RuPay';
  if (/visa/i.test(account)) return 'VISA';
  if (/master/i.test(account)) return 'Mastercard';
  if (/diners/i.test(account)) return 'Diners Club';
  return null;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(account: string): string {
  const words = account.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Stable placeholder "last 4" derived from the name hash — not a real card number.
/**
 * The real last four digits, or null.
 *
 * This used to derive a number from a hash of the account name, which rendered a
 * convincing but entirely invented "•• 8830" on the card. Showing a fabricated account
 * number in a finance app is worse than showing none, so only genuine digits — learned
 * from a statement or an alert and stored in card_map — are ever displayed.
 */
export function realLast4(account: string): string | null {
  const m = account.match(/\b(\d{4})\b(?!.*\b\d{4}\b)/);
  return m ? m[1] : null;
}
