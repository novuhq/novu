import { ScanEye } from 'lucide-react';
import { type ReactNode } from 'react';
import { GithubIcon, LinearIcon, NotionIcon } from '@/components/icons/mcp';
import { ConnectBrandLogo } from './connect-brand-logo';
import { TrustedCompanies } from './trusted-companies';

// Connect-branded side panel on `/auth/sign-in` and `/auth/sign-up` — Connect equivalent of `AuthSideBanner`.
export function ConnectAuthSideBanner() {
  return (
    <div className="inline-flex h-full w-full min-w-[562px] shrink-0 max-w-[562px] flex-col items-start justify-center gap-[52px] p-5">
      <div className="flex w-full flex-col items-start gap-6">
        <div className="flex w-full flex-col items-start gap-4">
          <ConnectBrandLogo />
          <div className="hidden max-w-[331px] flex-col items-start gap-1.5 md:flex">
            <h2 className="text-[24px] font-medium leading-9 tracking-[-0.36px] text-[#0e121b]">
              Connect your agent.{' '}
              <span className="text-[#99a0ae]">Everywhere your team works.</span>
            </h2>
            <div className="flex items-center gap-1">
              <CheckCircleSoft className="size-3 shrink-0" />
              <span className="text-xs font-medium leading-4 text-[#99a0ae]">
                Takes 30 seconds. No credit card required.
              </span>
            </div>
          </div>
        </div>

        <div className="hidden w-full min-w-[522px] shrink-0 flex-col items-start gap-1.5 py-3 md:flex">
          <FeatureRow>
            <span className="shrink-0 whitespace-nowrap">Talk to your agent across</span>
            <IntegrationPill
              rotate={-1}
              icon={<img src="/images/providers/light/square/slack.svg" alt="" className="size-3.5 shrink-0" />}
            >
              Slack
            </IntegrationPill>
            <IntegrationPill
              rotate={1}
              icon={
                <img
                  src="/images/providers/light/square/whatsapp-business.svg"
                  alt=""
                  className="size-3.5 shrink-0"
                />
              }
            >
              WhatsApp
            </IntegrationPill>
            <IntegrationPill
              rotate={-1}
              icon={<img src="/images/providers/light/square/msteams.svg" alt="" className="size-3.5 shrink-0" />}
            >
              MS Teams
            </IntegrationPill>
            <span className="shrink-0 whitespace-nowrap">and more.</span>
          </FeatureRow>

          <FeatureRow>
            <span className="shrink-0 whitespace-nowrap">
              Authorize tools mid-conversation. No setup gauntlets.
            </span>
          </FeatureRow>

          <FeatureRow>
            <span className="shrink-0 whitespace-nowrap">Connect tools and MCPs you use:</span>
            <IntegrationPill rotate={-1} icon={<GithubIcon className="size-3.5 shrink-0" />}>
              GitHub
            </IntegrationPill>
            <IntegrationPill rotate={1} icon={<LinearIcon className="size-3.5 shrink-0" />}>
              Linear
            </IntegrationPill>
            <IntegrationPill rotate={-1} icon={<NotionIcon className="size-3.5 shrink-0" />}>
              Notion
            </IntegrationPill>
          </FeatureRow>
        </div>
      </div>

      <div className="hidden self-center md:block">
        <TrustedCompanies label="TRUSTED BY TEAMS AT" />
      </div>
    </div>
  );
}

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-6 shrink-0 items-center gap-2">
      <ScanEye className="size-3 shrink-0 text-[#99a0ae]" />
      <div className="flex shrink-0 flex-nowrap items-center gap-1 text-sm font-medium leading-5 tracking-[-0.084px] text-[#525866]">
        {children}
      </div>
    </div>
  );
}

interface IntegrationPillProps {
  icon: ReactNode;
  children: ReactNode;
  rotate?: number;
}

function IntegrationPill({ icon, children, rotate = 0 }: IntegrationPillProps) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-[#f2f5f8] bg-[#fbfbfb] px-1 py-0.5 align-middle text-sm font-medium leading-5 text-[#0e121b]"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {icon}
      {children}
    </span>
  );
}

// 12 px neutral check-in-circle — `CircleCheck` is green and meant for completed-step UI.
function CheckCircleSoft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5" stroke="#99a0ae" strokeWidth="1" />
      <path
        d="M4 6.2 5.3 7.5 8 4.8"
        stroke="#99a0ae"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
