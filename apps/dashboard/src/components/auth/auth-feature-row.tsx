import { ReactNode } from 'react';

interface AuthFeatureRowProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function AuthFeatureRow({ icon, title, description }: AuthFeatureRowProps) {
  return (
    <div className="inline-flex items-start justify-start gap-3.5">
      <div className="flex items-center justify-center p-1">{icon}</div>
      <div className="inline-flex shrink grow basis-0 flex-col items-start justify-start gap-2">
        <div className="text-sm font-medium text-neutral-950">{title}</div>
        <div className="text-muted text-xs font-normal text-neutral-400">{description}</div>
      </div>
    </div>
  );
}
