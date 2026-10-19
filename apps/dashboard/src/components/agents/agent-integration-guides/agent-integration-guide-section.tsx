import { type ReactNode } from 'react';

type AgentIntegrationGuideSectionProps = {
  title: string;
  children: ReactNode;
};

export function AgentIntegrationGuideSection({ title, children }: AgentIntegrationGuideSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-text-strong text-label-sm font-medium leading-5">{title}</h3>
      <div className="text-text-soft text-label-sm leading-5">{children}</div>
    </section>
  );
}
