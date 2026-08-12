import Amount from './Amount';

export default function StatTile({ value, label, sub, tone, plain }: { value: number | string; label: string; sub?: string; tone?: 'pos' | 'warn' | 'default'; plain?: boolean }) {
  const color = tone === 'pos' ? 'text-credgreen' : tone === 'warn' ? 'text-[#B0731A]' : 'text-credink';
  return (
    <div className="bg-credsurface border border-credline rounded-2xl px-4 py-4 flex-1">
      <div className="text-caption uppercase tracking-wide text-credink font-bold mb-2">{label}</div>
      <div className={color}>
        {plain || typeof value === 'string' ? (
          <div className="text-heading font-bold mono leading-none">{value}</div>
        ) : (
          <Amount value={value} size="md" />
        )}
      </div>
      {sub && <div className="text-micro text-credmuted mt-1.5 font-medium">{sub}</div>}
    </div>
  );
}
