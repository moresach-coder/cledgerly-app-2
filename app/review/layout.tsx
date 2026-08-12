import { Suspense, ReactNode } from 'react';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
