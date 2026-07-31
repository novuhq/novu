import { type ReactNode } from 'react';

export function DefaultContentCard({ children }: { children: ReactNode }) {
  return <div className="rounded-12 bg-bg-weak flex flex-col gap-2 border border-neutral-100 p-2">{children}</div>;
}
