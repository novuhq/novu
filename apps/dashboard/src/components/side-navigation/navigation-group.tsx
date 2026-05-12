import { ReactNode } from 'react';

type NavigationGroupProps = {
  children: ReactNode;
  label?: string;
};

export function NavigationGroup({ children, label }: NavigationGroupProps) {
  return (
    <div className="flex flex-col last:mt-auto">
      {!!label && <span className="text-foreground-400 px-2 py-1 text-sm">{label}</span>}
      {children}
    </div>
  );
}
