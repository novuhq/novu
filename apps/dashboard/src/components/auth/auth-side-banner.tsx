import { Button } from '@/components/primitives/button';
import { openInNewTab } from '@/utils/url';
import { IS_ENTERPRISE, IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../config';
import { Battery } from '../icons/battery';
import { CircleCheck } from '../icons/circle-check';
import { Plug } from '../icons/plug';
import { ShieldZap } from '../icons/shield-zap';
import { Sparkling } from '../icons/sparkling';
import { AuthFeatureRow } from './auth-feature-row';
import { TrustedCompanies } from './trusted-companies';

export function AuthSideBanner() {
  return (
    <div className="inline-flex h-full w-full max-w-[476px] flex-col items-center justify-center gap-[50px] p-5">
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
