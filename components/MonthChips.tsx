function monthName(k: string) {
  const n = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m] = k.split('-');
  return `${n[Number(m) - 1]} ${y}`;
}

/**
 * Period filter. Labelled and with a filled active chip — as a bare row of outlined
 * pills it read as decoration rather than something you could act on.
 */
export default function MonthChips({
  months,
  value,
  onChange,
  includeAll = true,
}: {
  months: string[];
  value: string;
  onChange: (m: string) => void;
  includeAll?: boolean;
}) {
  const items = includeAll ? ['all', ...months] : months;
  const label = value === 'all' ? 'All time' : monthName(value);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-credmuted" aria-hidden>
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        <span className="text-caption uppercase tracking-[0.12em] font-bold text-credmuted">
          Period
        </span>
        <span className="text-caption font-bold text-credink">· {label}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5">
        {items.map((m) => {
          const active = value === m;
          return (
            <button
              key={m}
              onClick={() => onChange(m)}
              aria-pressed={active}
              className={`flex-none px-3.5 py-2 rounded-full text-caption uppercase tracking-wide font-bold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-credink text-white'
                  : 'bg-credsurface border border-credline text-credmuted hover:text-credink'
              }`}
            >
              {m === 'all' ? 'All time' : monthName(m)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
