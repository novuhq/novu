import { MessagesSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { RiCheckLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { readProductTypeParam } from '@/utils/product-type-pending';
import { openInNewTab } from '@/utils/url';
import { IS_ENTERPRISE, IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../config';
import { Battery } from '../icons/battery';
import { CircleCheck } from '../icons/circle-check';
import { Plug } from '../icons/plug';
import { ShieldZap } from '../icons/shield-zap';
import { Sparkling } from '../icons/sparkling';
import { AuthFeatureRow } from './auth-feature-row';
import { TrustedCompanies } from './trusted-companies';

export type AuthSideBannerVariant = 'default' | 'agents';

type AuthSideBannerProps = {
  variant?: AuthSideBannerVariant;
};

// Variant resolution is centralized here so every auth page (sign-in, sign-up, verify-email, etc.)
// stays consistent. When an explicit `variant` isn't passed, derive it from the live `product_type`
// query/hash param only — never the persisted value — so a refresh without the param shows default.
export function AuthSideBanner({ variant }: AuthSideBannerProps) {
  const resolvedVariant = variant ?? (readProductTypeParam() === 'agents' ? 'agents' : 'default');

  if (resolvedVariant === 'agents') {
    return <AgentsSideBanner />;
  }

  return (
    <div className="inline-flex h-full w-full max-w-[580px] flex-col items-center justify-center gap-[40px] p-5">
      <div className="flex flex-col items-start justify-start gap-4 self-start">
        <div className="inline-flex items-center justify-start gap-3">
          <img src="/images/novu-logo-dark.svg" className="w-24" alt="logo" />
        </div>
        {IS_SELF_HOSTED ? (
          <div className="flex hidden flex-col items-start justify-start gap-4 md:block">
            <div className="flex flex-col items-start justify-start gap-1.5 self-stretch">
              <div className="text-2xl font-medium leading-8 text-neutral-950">
                {IS_ENTERPRISE ? 'Welcome to Novu Enterprise' : 'Welcome to Novu Self-Hosted!'}
              </div>
              <div className="text-sm leading-snug text-neutral-500">
                {IS_ENTERPRISE
                  ? 'Enterprise-grade notification infrastructure with premium support and advanced features.'
                  : 'Full control over your notification infrastructure. Backed by a vibrant community.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start justify-start gap-4 md:block">
            <div className="flex flex-col items-start justify-start gap-1.5 self-stretch">
              <div className="text-2xl font-medium leading-8 tracking-tight">
                <span className="text-neutral-950">The communication stack</span> <br />
                <span className="text-neutral-400 font-normal">you'll never have to build again.</span>
              </div>
              <div className="inline-flex justify-start gap-1">
                <CircleCheck className="h-3 w-3" color="#99a0ad" />
                <div className="text-xs font-normal leading-none text-neutral-400">
                  Takes 30 seconds. No credit card required.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {IS_SELF_HOSTED ? (
        <div className="hidden md:flex md:flex-col md:items-start md:justify-start md:gap-8 md:self-stretch">
          <AuthFeatureRow
            icon={<Plug className="h-6 w-6 text-[#DD2450]" />}
            title={
              IS_ENTERPRISE ? 'Enterprise Data Sovereignty & Compliance' : 'Full Data Control & Unlimited Customization'
            }
            description={
              IS_ENTERPRISE
                ? 'Complete data residency control with enterprise-grade security, compliance certifications, and audit trails.'
                : 'Host Novu on your own infrastructure, tailor it to your exact needs, and own your data.'
            }
          />
          <AuthFeatureRow
            icon={<Sparkling className="h-6 w-6" />}
            title={IS_ENTERPRISE ? 'Premium Support & Professional Services' : 'Community-Driven & Transparent'}
            description={
              IS_ENTERPRISE
                ? 'Dedicated account management, priority support, and professional services for seamless deployment and optimization.'
                : 'Leverage the power of open-source. Contribute, inspect the code, and be part of our active community.'
            }
          />
          <AuthFeatureRow
            icon={<ShieldZap className="h-6 w-6" />}
            title={
              IS_ENTERPRISE ? 'Enterprise-Grade Performance & Reliability' : 'Scalable, Secure, and Enterprise-Ready'
            }
            description={
              IS_ENTERPRISE
                ? 'Mission-critical SLAs, advanced monitoring, and enterprise integrations built for large-scale operations.'
                : 'Built to handle any volume, ensuring reliable delivery for your mission-critical notifications.'
            }
          />
        </div>
      ) : (
        <div className="hidden md:flex md:flex-col md:items-start md:justify-start md:gap-8 md:self-stretch">
          <AuthFeatureRow
            icon={<Plug className="h-6 w-6 text-[#DD2450]" />}
            title="Trigger once. Deliver every channel your users are on."
            description="Email, SMS, Push, In-app, Slack, Teams, WhatsApp; add a channel without touching your integration layer."
          />
          <AuthFeatureRow
            icon={<Battery className="h-6 w-6 text-[#DD2450]" />}
            title="Send notifications. Have conversations. One platform."
            description="AI agent conversations and notification workflows; delays, digests, conditions, fallbacks. No infrastructure to write or maintain."
          />
          <AuthFeatureRow
            icon={<ShieldZap className="h-6 w-6" />}
            title="Built for production from day one."
            description="99.9% uptime SLA. SOC 2 Type II. Self-host or cloud. Open source. No lock-in. Any volume, any team size."
          />
        </div>
      )}
      {IS_SELF_HOSTED && !IS_ENTERPRISE && (
        <div className="border-stroke-soft rounded-8 hidden flex-col items-start justify-start gap-3 self-stretch border from-blue-50/80 to-transparent p-6 shadow-md md:flex">
          <h3 className="text-lg font-semibold text-neutral-900">Looking for a Managed Solution?</h3>
          <p className="text-sm text-neutral-600">
            Explore Novu Cloud for a fully managed experience with dedicated support, advanced features, and seamless
            scalability.
          </p>
          <Button
            variant="primary"
            className="mt-2 w-full sm:w-auto"
            onClick={() => openInNewTab(SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=auth_banner_contact_sales')}
          >
            Learn More
          </Button>
        </div>
      )}
      <div className="hidden md:block">
        <TrustedCompanies />
      </div>
    </div>
  );
}

function BannerPill({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[#e8ebef] bg-[#f8f9fa] px-1 py-0.5 align-middle text-xs font-medium text-[#3a3f47]">
      {icon}
      {children}
    </span>
  );
}

function AgentsCheckRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <RiCheckLine className="mt-[3px] size-3 shrink-0 text-[#b0b8c4]" />
      {/* Inline text flow (not flex) so the copy wraps word-by-word and fills each line; inline-flex
       * pills sit mid-line via align-middle. */}
      <span className="text-sm leading-relaxed text-[#525866]">{children}</span>
    </div>
  );
}

function AgentsSideBanner() {
  return (
    <div className="inline-flex h-full w-full max-w-[580px] flex-col items-center justify-center gap-[40px] p-5">
      <div className="flex flex-col items-start justify-start gap-4 self-start">
        <div className="inline-flex items-center justify-start gap-3">
          <img src="/images/novu-logo-dark.svg" className="w-24" alt="logo" />
        </div>
        <div className="flex flex-col items-start justify-start gap-4 md:block">
          <div className="flex flex-col items-start justify-start gap-1.5 self-stretch">
            <div className="text-2xl font-medium leading-8 tracking-tight">
              <span className="text-neutral-950">Your AI agents belong</span> <br />
              <span className="text-neutral-400 font-normal">where your users already are.</span>
            </div>
            <div className="inline-flex justify-start gap-1">
              <CircleCheck className="h-3 w-3" color="#99a0ad" />
              <div className="text-xs font-normal leading-none text-neutral-400">
                Takes 30 seconds. No credit card required.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:flex md:flex-col md:items-start md:justify-start md:gap-4 md:self-stretch">
        <AgentsCheckRow>
          Chat with your agent across{' '}
          <BannerPill icon={<img src="/images/providers/light/square/slack.svg" alt="" className="size-4" />}>
            Slack
          </BannerPill>{' '}
          <BannerPill
            icon={<img src="/images/providers/light/square/whatsapp-business.svg" alt="" className="size-4" />}
          >
            Whatsapp
          </BannerPill>{' '}
          <BannerPill icon={<img src="/images/providers/light/square/msteams.svg" alt="" className="size-4" />}>
            MS Teams
          </BannerPill>{' '}
          and more.
        </AgentsCheckRow>
        <AgentsCheckRow>Authorize tools mid-conversation. No setup gauntlets.</AgentsCheckRow>
        <AgentsCheckRow>
          Connect tools and MCPs you use:{' '}
          <BannerPill icon={<img src="/images/providers/light/square/github.svg" alt="" className="size-4" />}>
            GitHub
          </BannerPill>{' '}
          <BannerPill icon={<img src="/images/providers/light/square/linear.svg" alt="" className="size-4" />}>
            Linear
          </BannerPill>{' '}
          <BannerPill icon={<img src="/images/providers/light/square/notion.svg" alt="" className="size-4" />}>
            Notion
          </BannerPill>
        </AgentsCheckRow>
        <AgentsCheckRow>
          Access conversation history{' '}
          <BannerPill icon={<MessagesSquare className="size-3 text-[#99a0ae]" />}>5</BannerPill> and state via unified
          agent() handler.
        </AgentsCheckRow>
      </div>
      <div className="hidden md:block">
        <TrustedCompanies label="TRUSTED BY TEAMS AT" />
      </div>
    </div>
  );
}
