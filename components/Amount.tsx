import { fmtParts } from '@/lib/reference';

export default function Amount({ value, size = 'md', sign }: { value: number; size?: 'sm' | 'md' | 'lg' | 'xl'; sign?: boolean }) {
  const { int, dec } = fmtParts(Math.abs(value));
  const abs = Math.abs(value);
  const sizeMap = { sm: 'text-body', md: 'text-title', lg: 'text-heading', xl: 'text-display' };
  let sizeCls = sizeMap[size];
  if ((size === 'lg' || size === 'xl') && abs >= 10000000) sizeCls = 'text-title';
  if ((size === 'lg' || size === 'xl') && abs >= 1000000000) sizeCls = 'text-body';
  return (
    <span className={`font-bold mono ${sizeCls}`}>
      {sign && value >= 0 ? '+' : ''}
      {value < 0 ? '-' : ''}
      &#8377;{int}
      <span className="font-normal opacity-40">.{dec}</span>
    </span>
  );
}
