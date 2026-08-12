// Smart expense categorization engine.
//
// Approach: start with hardcoded merchant patterns (rules), then let users
// create custom rules by marking txns. When a rule matches, suggest applying
// it to other similar merchants.

import type { Txn } from './repo';

export type CategoryId =
  | 'housing' | 'food' | 'transport' | 'health' | 'subs' | 'fashion'
  | 'travel' | 'family' | 'utilities' | 'education' | 'household' | 'other';

export interface CategorizedTxn {
  category: CategoryId | null;
  confidence: 'high' | 'medium' | 'low';
  ruleUsed?: string;
}

/** Builtin merchant → category patterns. Organized by category, keyed by merchant patterns. */
const BUILTIN_RULES: Record<CategoryId, RegExp[]> = {
  food: [
    /starbucks|cafe|coffee|cafe coffee day/i,
    /swiggy|zomato|dunzo|deliveroo|uber\s*eats/i,
    /mcd|mcdonalds|kfc|dominos|pizza/i,
    /restaurant|diner|bistro|barbeque|bbq/i,
    /bakery|cake|bread|pastry/i,
    /panipuri|chaat|thali|dhaba/i,
    /bar|pub|wine|alcohol|brewery/i,
    /grocery|supermarket|bigbasket|blinkit|fresh/i,
  ],
  transport: [
    /uber|ola|lyft|cab|taxi/i,
    /airasia|spicejet|indigo|vistara|lufthansa|emirates/i,
    /railways|irctc|train/i,
    /petrol|fuel|gas|charging|tesla/i,
    /metro|bus|transit|mobility/i,
    /parking|toll|vehicle\s*registration/i,
  ],
  subs: [
    /netflix|prime|hulu|disney|hotstar|zee|sony\s*liv/i,
    /spotify|apple\s*music|amazon\s*music|wynk|jiosaavn/i,
    /notion|slack|adobe|figma|sketch/i,
    /medium|substack|patreon/i,
    /gym|fitness|peloton|classpass/i,
    /membership|subscription|annual\s*fee/i,
  ],
  utilities: [
    /electricity|power|eskom|bescom|tata\s*power/i,
    /water|sewage|municipal/i,
    /broadband|airtel|jio|vodafone|internet|wifi/i,
    /gas|cylinder|lpg|png/i,
  ],
  health: [
    /hospital|clinic|doctor|practitioner/i,
    /pharma|medicine|pharmacy|healthmart|netmeds/i,
    /dental|dentist/i,
    /optical|eye\s*care|vision/i,
    /therapy|counseling|wellness/i,
    /gym|yoga|fitness/i,
    /apollo|fortis|acibadem|manipal/i,
  ],
  housing: [
    /rent|landlord|housing|property\s*management/i,
    /home\s*loan|mortgage|builder|developer/i,
    /maintenance|society|hoa|condo\s*fee/i,
  ],
  education: [
    /school|college|university|institute/i,
    /course|udemy|coursera|skillshare|unacademy/i,
    /tuition|coaching|class|training/i,
    /book|kindle|ebook|library/i,
  ],
  fashion: [
    /amazon|flipkart|myntra|ajio|uniqa/i,
    /zara|h\&m|forever21|uniqlo|gap/i,
    /nike|adidas|puma|reebok|sports/i,
    /saree|ethnic|apparel|clothing|wear/i,
    /tailoring|alteration|dry\s*clean/i,
  ],
  travel: [
    /hotel|airbnb|booking|oyo|resort|hostel|motel/i,
    /tourist|sightseeing|tour|travel\s*agency/i,
    /holiday|vacation|vacation\s*rental/i,
  ],
  family: [
    /school\s*fees|school/i,
    /dependent|child\s*care|nanny|daycare/i,
    /parents|elder\s*care/i,
  ],
  household: [
    /maid|housemaid|cleaning|laundry/i,
    /cook|chef|cook\s*service/i,
    /gardener|landscaping|maintenance/i,
  ],
  other: [],
};

/** Normalize merchant name for matching. */
function normalize(merchant: string): string {
  return merchant.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
}

/** Find the best matching category for a merchant. */
export function categorize(merchant: string): CategorizedTxn {
  const norm = normalize(merchant);
  if (!norm) return { category: null, confidence: 'low' };

  for (const [cat, patterns] of Object.entries(BUILTIN_RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(norm)) {
        return {
          category: cat as CategoryId,
          confidence: 'high',
          ruleUsed: pattern.source,
        };
      }
    }
  }

  return { category: null, confidence: 'low' };
}

/** Similarity score between two merchants (0–1). Used to find "similar" txns. */
export function merchantSimilarity(m1: string, m2: string): number {
  const n1 = normalize(m1);
  const n2 = normalize(m2);

  // Exact match
  if (n1 === n2) return 1;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = Math.min(n1.length, n2.length);
    const longer = Math.max(n1.length, n2.length);
    return shorter / longer;
  }

  // Extract key "words" (remove common noise like #, store numbers)
  const words1 = n1.split(/\s+/).filter(w => w.length > 2 && !/^\d+$/.test(w));
  const words2 = n2.split(/\s+/).filter(w => w.length > 2 && !/^\d+$/.test(w));

  if (!words1.length || !words2.length) return 0;

  const common = words1.filter(w => words2.includes(w)).length;
  const total = Math.max(words1.length, words2.length);

  return common / total;
}

/** Find all txns similar to a given merchant. */
export function findSimilarMerchants(
  merchants: string[],
  targetMerchant: string,
  threshold = 0.5
): string[] {
  const scores = merchants
    .map(m => ({ merchant: m, score: merchantSimilarity(m, targetMerchant) }))
    .filter(s => s.score >= threshold && s.merchant !== targetMerchant)
    .sort((a, b) => b.score - a.score);

  return scores.map(s => s.merchant);
}
