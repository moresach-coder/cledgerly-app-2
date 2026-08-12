'use client';
import CardVisual from './CardVisual';
import type { AccountListItem } from '@/lib/repo';

// Enough of each covered card to show its wordmark, amount and masked number — the
// same information Cred leaves visible on the cards behind the active one.
const PEEK = 78;
const CARD_H = 200;

export default function CardStack({
  accounts,
  onSelect,
}: {
  accounts: AccountListItem[];
  onSelect: (account: string) => void;
}) {
  const sorted = [...accounts].sort((a, b) => b.monthSpend - a.monthSpend);
  const [hero, ...rest] = sorted;
  if (!hero) return null;

  return (
    <div>
      <CardVisual account={hero.account} amount={hero.monthSpend} amountLabel="this month" size="lg" onClick={() => onSelect(hero.account)} />
      <div className="flex justify-center mt-3 mb-8">
        <button
          onClick={() => onSelect(hero.account)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-credline text-small font-semibold text-credink"
        >
          View details <span aria-hidden>›</span>
        </button>
      </div>

      {rest.length > 0 && (
        <div className="relative" style={{ height: PEEK * (rest.length - 1) + CARD_H }}>
          {rest.map((a, i) => (
            <div key={a.account} className="absolute inset-x-0" style={{ top: i * PEEK, zIndex: i + 1 }}>
              <CardVisual account={a.account} amount={a.monthSpend} amountLabel="this month" onClick={() => onSelect(a.account)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
