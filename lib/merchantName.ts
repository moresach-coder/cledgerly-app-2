/**
 * Turns a raw statement narration into something a person would call the merchant.
 *
 * Card networks append the city, country, currency and a settlement number to every line
 * — "AMAZON PAY IN GROCERY BANGALORE IN 180" — and bank rows lead with the channel used
 * ("NET BANKING INF INFT …"). Displaying that verbatim makes every list unreadable, so
 * the raw string stays in the data and only the display name is cleaned.
 */

/** Well-known merchants, matched first so their canonical name always wins. */
const BRANDS: [RegExp, string][] = [
  [/\bamazon\s*pay\b/i, 'Amazon Pay'],
  [/\bamazon\b/i, 'Amazon'],
  [/\bswiggy\s*instamart\b/i, 'Swiggy Instamart'],
  [/\bswiggy\b/i, 'Swiggy'],
  [/\bzomato\b/i, 'Zomato'],
  [/\bblinkit\b/i, 'Blinkit'],
  [/\bzepto\b/i, 'Zepto'],
  [/\bbigbasket\b/i, 'BigBasket'],
  [/\bstarbucks\b/i, 'Starbucks'],
  [/\bmcd\b|\bmcdonald/i, "McDonald's"],
  [/\bdomino/i, "Domino's"],
  [/\bnetflix\b/i, 'Netflix'],
  [/\bspotify\b/i, 'Spotify'],
  [/\bhotstar\b|\bdisney\b/i, 'Hotstar'],
  [/\bprime\s*video\b/i, 'Prime Video'],
  [/\badobe\b/i, 'Adobe'],
  [/\bapple\b|\bicloud\b/i, 'Apple'],
  [/\bgoogle\b/i, 'Google'],
  [/\buber\b/i, 'Uber'],
  [/\bola\b/i, 'Ola'],
  [/\brapido\b/i, 'Rapido'],
  [/\bairtel\b/i, 'Airtel'],
  [/\bjio\b/i, 'Jio'],
  [/\bvodafone\b|\bvi\b/i, 'Vi'],
  [/\bbses\b/i, 'BSES'],
  [/\bmyntra\b/i, 'Myntra'],
  [/\bajio\b/i, 'AJIO'],
  [/\bnykaa\b/i, 'Nykaa'],
  [/\bh\s*&\s*m\b/i, 'H&M'],
  [/\bzara\b/i, 'Zara'],
  [/\bvijay\s*sales\b/i, 'Vijay Sales'],
  [/\btaj\b/i, 'Taj Hotels'],
  [/\bmarriott\b|\bbonvoy\b/i, 'Marriott'],
  [/\bmakemytrip\b/i, 'MakeMyTrip'],
  [/\bgoibibo\b/i, 'Goibibo'],
  [/\birctc\b/i, 'IRCTC'],
  [/\bindigo\b/i, 'IndiGo'],
  [/\bapollo\b/i, 'Apollo'],
  [/\bpharmeasy\b/i, 'PharmEasy'],
  [/\b1mg\b/i, 'Tata 1mg'],
  [/\bfittr\b/i, 'Fittr'],
  [/\btui\b/i, 'TUI'],
  [/\bzerodha\b/i, 'Zerodha'],
  [/\bgroww\b/i, 'Groww'],
];

/** Channel prefixes banks stamp on their own rows; never part of the merchant. */
const CHANNEL =
  /^(net\s*banking|mobile\s*banking|internet\s*banking|card\s*atd|cms\s*transaction|bil|inft|imps|neft|rtgs|upi|ach|ecs|nach|pos|atw|vps|mmt|inf|auto)\b[\s\-:/]*/i;

/** Trailing location / currency / settlement noise on card network lines. */
const COUNTRY = /\b(in|th|us|uk|ae|sg|my|id|lk|np|fr|de|it|es|jp|au|ca)\b/i;
const CURRENCY = /\b(inr|thb|usd|gbp|eur|aed|sgd|myr|jpy|aud|cad)\b/i;
const CITIES =
  /\b(bangalore|bengaluru|mumbai|pune|delhi|new\s*delhi|gurgaon|gurugram|noida|hyderabad|chennai|kolkata|ahmedabad|jaipur|phuket|bangkok|krabi|dubai|singapore|london|paris)\b/i;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Masked card references ("CC0xx8285") name an instrument, not a merchant. */
const CARD_REF = /^cc?\d?[xX*]{2,}\d{3,}$/i;

/**
 * A short, readable name. The full narration is always still available on the
 * transaction itself, so nothing is lost — only the label is shortened.
 */
export function displayMerchant(raw: string): string {
  if (!raw) return 'Unknown';
  const s = raw.trim();

  for (const [re, name] of BRANDS) if (re.test(s)) return name;

  // Rows stack several channel tokens ("NET BANKING INF INFT …"), so strip until stable.
  let out = s;
  for (let i = 0; i < 4; i++) {
    const next = out.replace(CHANNEL, '');
    if (next === out) break;
    out = next;
  }

  // A row that is only a card reference has no merchant to show.
  if (CARD_REF.test(out.trim())) return 'Card payment';

  const words = out
    .split(/[\s/|,]+/)
    .filter(Boolean)
    // Drop settlement numbers, long reference blobs, currency and country codes.
    .filter((w) => !/^\d+[.\d]*$/.test(w))
    .filter((w) => !/^[A-Z]{2,4}\d{6,}$/i.test(w))
    .filter((w) => !/\d{6,}/.test(w))
    .filter((w) => !CURRENCY.test(w))
    .filter((w) => !CITIES.test(w));

  // A trailing bare country code only ever follows the location.
  while (words.length > 1 && COUNTRY.test(words[words.length - 1])) words.pop();

  const cleaned = words
    .slice(0, 3)
    .join(' ')
    .replace(/[^\w&'.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    // A name never usefully ends on a conjunction left behind by truncation.
    .replace(/\s*[&+\-]\s*$/, '')
    .replace(/\s+and$/i, '')
    .trim();
  if (!cleaned || cleaned.length < 2) return titleCase(s.split(/\s+/).slice(0, 3).join(' ')) || 'Unknown';

  return titleCase(cleaned);
}

/** Sub-label with the detail the short name drops, when there is any. */
export function merchantDetail(raw: string): string | null {
  const short = displayMerchant(raw);
  const rest = raw.trim();
  return rest.toLowerCase().startsWith(short.toLowerCase()) && rest.length <= short.length + 2 ? null : rest;
}
