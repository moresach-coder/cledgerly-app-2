const PATHS: Record<string, string> = {
  housing: 'M3 10.5 10 4l7 6.5M5 9v7h10V9M8 16v-4h4v4',
  food: 'M6 3v6a2 2 0 0 0 4 0V3M8 9v8M14 3c-1.5 1-2 2.5-2 4.5S13 12 14 12v6',
  groceries: 'M4 4h2l2.5 9h6L17 6H7M8.5 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM13.5 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  transport: 'M4 13l1.5-5A2 2 0 0 1 7.4 6.5h5.2A2 2 0 0 1 14.5 8L16 13M4 13h12v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3Z M6.5 13.5h.01M13.5 13.5h.01',
  health: 'M10 17s-6-3.7-6-8.2C4 6 5.8 4 8 4c1 0 2 .5 2 1.5C10 4.5 11 4 12 4c2.2 0 4 2 4 4.8 0 4.5-6 8.2-6 8.2Z',
  medical: 'M10 3v14M7 7h6M4 10h12M6 13h8M10 3a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z',
  subs: 'M4 10a6 6 0 0 1 10-4.5M16 10a6 6 0 0 1-10 4.5M14 3v3h-3M6 17v-3h3',
  entertainment: 'M5 4h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8.5 7.5l4 2.5-4 2.5Z',
  fashion: 'M7 4 4 7l2 2 1-1v8h6V8l1 1 2-2-3-3-2 2-2-2Z',
  shopping: 'M4 4h1l1 2h11l-2 7H7L4 4ZM8 16.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1ZM14 16.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1ZM6 6l1.5 6h8',
  travel: 'M10 3l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1 2-5Z',
  family: 'M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM13 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 16c0-2.2 1.8-4 4-4s4 1.8 4 4M9 16c0-2.2 1.8-4 4-4s4 1.8 4 4',
  utilities: 'M11 3 5 11h4l-1 6 6-8h-4l1-6Z',
  education: 'M10 4 2 8l8 4 8-4-8-4ZM5 10v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4',
  household: 'M5 4v12M5 4h9l-1.5 3L14 10H5',
  insurance: 'M10 3l6 3v4c0 4-2.5 7-6 8.5C6.5 17 4 14 4 10V6l6-3Z',
  loan: 'M10 3v14M6 7l4-4 4 4M4 17h12M7 13h6',
  taxes: 'M4 4h12v12H4ZM4 8h12M8 4v12M12 8v4',
  fitness: 'M4 10h2v-3h2v6h2v-6h2v6h2v-3h2M3 10h1M17 10h1',
  personal_care: 'M10 3a4 4 0 0 1 4 4c0 3-4 6-4 6S6 10 6 7a4 4 0 0 1 4-4ZM8 14l-2 3h8l-2-3',
  gifts: 'M4 8h12v2H4ZM5 10v6h10v-6M10 8v8M7 8c-1 0-2-1-2-2s1-2 2-2c1.5 0 3 2 3 4M13 8c1 0 2-1 2-2s-1-2-2-2c-1.5 0-3 2-3 4',
  investments: 'M4 16l4-5 3 3 5-7M14 7h3v3',
  other: 'M10 10m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M8 10h4M10 8v4',
  unknown: 'M10 10m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M8.2 8a1.8 1.8 0 1 1 2.6 1.6c-.5.3-.8.7-.8 1.3M10 13.5h.01',
};

export default function CategoryIcon({ id, size = 20 }: { id: string | null; size?: number }) {
  const d = PATHS[id || 'other'] || PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
