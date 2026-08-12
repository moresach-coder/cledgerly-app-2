'use client';
import { useState } from 'react';
import { themeFor, shortMarkOf, brandSlug } from '@/lib/cardMeta';

// Tried in order; first one that loads wins. SVG preferred, PNG/WEBP accepted because
// those are easier to source from brand asset kits.
const EXTENSIONS = ['svg', 'png', 'webp'];

/**
 * Issuer identity for list rows — a circular white disc, matching the treatment Cred
 * uses in its account and bill lists.
 *
 * Renders /brands/<slug>.<ext> when such a file exists, otherwise falls back to a
 * brand-coloured disc with the issuer's short name. No logo artwork ships with this
 * repo; see public/brands/README.md.
 */
export default function BrandBadge({ account, size = 40 }: { account: string; size?: number }) {
  const t = themeFor(account);
  const mark = shortMarkOf(account);
  const slug = brandSlug(account);
  const [extIndex, setExtIndex] = useState(0);

  const hasLogo = slug !== 'unknown' && extIndex < EXTENSIONS.length;

  if (hasLogo) {
    return (
      <span
        className="rounded-full flex items-center justify-center flex-none overflow-hidden bg-credbg"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={EXTENSIONS[extIndex]}
          src={`/brands/${slug}.${EXTENSIONS[extIndex]}`}
          alt={`${mark} logo`}
          width={size}
          height={size}
          style={{ width: '88%', height: '88%', objectFit: 'contain' }}
          onError={() => setExtIndex((i) => i + 1)}
        />
      </span>
    );
  }

  const ink = t.light ? '#14151A' : '#FFFFFF';
  return (
    <span
      className="rounded-full flex items-center justify-center flex-none font-bold tracking-tight"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${t.from}, ${t.to})`,
        color: t.accent || ink,
        fontSize: mark.length > 4 ? size * 0.23 : size * 0.27,
      }}
    >
      {mark}
    </span>
  );
}
