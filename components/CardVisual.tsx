'use client';
import { themeFor, accountKind, realLast4, issuerOf, productOf, networkOf, type CardTheme } from '@/lib/cardMeta';
import Amount from './Amount';

/** Brand-characteristic background pattern. Generic geometry, drawn with CSS/SVG. */
function Texture({ t, ink }: { t: CardTheme; ink: string }) {
  if (t.texture === 'guilloche') {
    return (
      <>
        {/* fine engraved guilloche — kept very low contrast so it reads as texture, not noise */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.13,
            backgroundImage: `repeating-radial-gradient(circle at 64% 54%, ${ink} 0px, ${ink} 0.5px, transparent 0.5px, transparent 7px)`,
          }}
        />
        {/* raised medallion */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 210, height: 210, left: '30%', top: '-16%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 34%, rgba(255,255,255,0.22) 60%, rgba(0,0,0,0.05) 70%, transparent 74%)',
          }}
        />
      </>
    );
  }
  if (t.texture === 'brushed') {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.5, backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.055) 0px, rgba(255,255,255,0.055) 1px, transparent 1px, transparent 2px)` }}
      />
    );
  }
  if (t.texture === 'chevron') {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 210" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="#fff" opacity="0.07">
          <path d="M150 210 L235 60 L320 210 Z" />
          <path d="M215 210 L300 60 L385 210 Z" opacity="0.7" />
        </g>
      </svg>
    );
  }
  if (t.texture === 'facet') {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 210" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g opacity="0.5">
          <path d="M0 96 L84 22 L150 74 L66 150 Z" fill="#fff" opacity="0.13" />
          <path d="M84 22 L188 0 L150 74 Z" fill="#fff" opacity="0.2" />
          <path d="M0 150 L66 150 L30 210 L0 210 Z" fill="#fff" opacity="0.07" />
          <path d="M150 74 L232 40 L206 132 Z" fill="#000" opacity="0.14" />
          <path d="M66 150 L150 74 L206 132 L120 210 L40 210 Z" fill="#000" opacity="0.09" />
        </g>
      </svg>
    );
  }
  if (t.texture === 'waves') {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 210" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="#fff" opacity="0.06">
          <path d="M195 210c0-70 30-95 62-118 34-24 51-46 51-92h40v210z" />
          <path d="M255 210c0-52 22-72 46-89 26-18 39-35 39-70h20v159z" opacity="0.8" />
        </g>
      </svg>
    );
  }
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.3, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 48%, transparent 62%)' }}
    />
  );
}

function Chip({ tone }: { tone: 'gold' | 'silver' }) {
  const bg = tone === 'gold'
    ? 'linear-gradient(150deg, #F0DFA8 0%, #D4B463 45%, #A8853B 100%)'
    : 'linear-gradient(150deg, #F2F3F5 0%, #CFD3D8 45%, #9BA1A9 100%)';
  return (
    <div className="w-[42px] h-[32px] rounded-[6px] relative overflow-hidden flex-none" style={{ background: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14)' }}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
      <div className="absolute inset-y-[18%] left-1/3 w-px bg-black/25" />
      <div className="absolute inset-y-[18%] left-2/3 w-px bg-black/25" />
      <div className="absolute left-[18%] right-[18%] top-[22%] h-px bg-black/20" />
      <div className="absolute left-[18%] right-[18%] bottom-[22%] h-px bg-black/20" />
    </div>
  );
}

export default function CardVisual({
  account,
  amount,
  amountLabel,
  size = 'md',
  onClick,
}: {
  account: string;
  amount: number;
  amountLabel: string;
  size?: 'md' | 'lg';
  onClick?: () => void;
}) {
  const t = themeFor(account);
  const kind = accountKind(account);
  const issuer = issuerOf(account);
  const product = productOf(account);
  const network = networkOf(account);
  const last4 = realLast4(account);
  const isBank = kind === 'bank';

  const inkHex = t.light ? '#14151A' : '#FFFFFF';
  const ink = t.light ? 'text-[#14151A]' : 'text-white';
  const soft = t.light ? 'text-[#14151A]/65' : 'text-white/65';
  const softer = t.light ? 'text-[#14151A]/50' : 'text-white/50';
  const h = size === 'lg' ? 'h-[212px]' : 'h-[200px]';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={`relative w-full ${h} rounded-[18px] p-[18px] flex flex-col justify-between overflow-hidden shrink-0 shadow-[0_18px_34px_-14px_rgba(0,0,0,0.45)] ${onClick ? 'cursor-pointer active:scale-[0.985] transition-transform' : ''}`}
      style={{ background: `linear-gradient(146deg, ${t.from} 0%, ${t.via} 52%, ${t.to} 100%)` }}
    >
      <Texture t={t} ink={inkHex} />

      {/* top: issuer wordmark + amount */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`text-body font-bold leading-tight tracking-tight ${t.accent ? '' : ink}`}
            style={t.accent ? { color: t.accent } : undefined}
          >
            {issuer}
          </div>
          {/* Only real digits are shown; nothing is invented to fill the space. */}
          <div className={`flex items-center gap-1.5 mt-2 ${soft}`}>
            {!isBank && network && <span className="text-micro font-bold tracking-wide">{network}</span>}
            {last4 ? (
              <span className="text-small tracking-[0.16em] font-medium mono">•• {last4}</span>
            ) : (
              <span className="text-micro uppercase tracking-[0.14em] font-semibold">
                {isBank ? 'Bank account' : 'Credit card'}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-none">
          <div className={ink}><Amount value={amount} size={size === 'lg' ? 'lg' : 'md'} /></div>
          <div className={`text-micro uppercase tracking-wider font-semibold mt-1 ${softer}`}>{amountLabel}</div>
        </div>
      </div>

      {/* An EMV chip belongs on a card. A savings account has no card, and drawing one
          made bank accounts read as credit cards. */}
      <div className="relative">
        {isBank ? (
          <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden className="opacity-70">
            <rect x="1" y="6" width="32" height="19" rx="2.5" stroke={inkHex} strokeWidth="1.6" opacity="0.55" />
            <path d="M17 1 32 6H2L17 1Z" fill={inkHex} opacity="0.55" />
            <path d="M7 11v9M13 11v9M21 11v9M27 11v9" stroke={inkHex} strokeWidth="1.4" opacity="0.45" />
          </svg>
        ) : (
          <Chip tone={t.chip || 'silver'} />
        )}
      </div>

      {/* bottom: product line + action */}
      <div className="relative flex items-end justify-between gap-3">
        <div className={`text-small font-semibold tracking-[0.14em] ${ink}`}>{product}</div>
        {onClick && (
          <div
            className="text-caption font-bold rounded-[7px] px-3.5 py-2 flex-none"
            style={t.light ? { background: '#14151A', color: '#fff' } : { background: '#fff', color: '#14151A' }}
          >
            View
          </div>
        )}
      </div>

      {kind === 'bank' && (
        <div className={`absolute right-[18px] bottom-[18px] text-micro uppercase tracking-widest font-semibold ${softer} pointer-events-none`}>
          {!onClick && 'Bank account'}
        </div>
      )}
    </div>
  );
}
