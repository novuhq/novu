import { type ReactNode } from 'react';
import { RiArrowLeftSLine } from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CompactButton } from '@/components/primitives/button-compact';

type AgentIntegrationGuideLayoutProps = {
  providerDisplayName: string;
  providerId: string;
  onBack: () => void;
  children: ReactNode;
  docHref?: string;
  /** When true, omits the back control (e.g. integrations hub sidebar is visible). */
  embedded?: boolean;
};

export function AgentIntegrationGuideLayout({
  providerDisplayName,
  providerId,
  onBack,
  children,
  docHref,
  embedded = false,
}: AgentIntegrationGuideLayoutProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        {embedded ? null : (
          <CompactButton
            type="button"
            size="lg"
            variant="ghost"
            className="w-fit"
            icon={RiArrowLeftSLine}
            onClick={onBack}
          >
            Back to integrations
          </CompactButton>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-10 shrink-0">
              <ProviderIcon providerId={providerId} providerDisplayName={providerDisplayName} className="size-full" />
            </div>
            <div className="min-w-0">
              <h2 className="text-text-strong text-[16px] font-medium leading-6 tracking-tight">
                {providerDisplayName}
              </h2>
              <p className="text-text-soft text-label-sm mt-0.5">Setup guide</p>
            </div>
          </div>
          {docHref ? (
            <a
              href={docHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-base text-label-sm font-medium shrink-0"
            >
              View documentation
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
