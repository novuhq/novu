import { SignUp as SignUpForm } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { ROUTES } from '@/utils/routes';
import { IS_SELF_HOSTED } from '../config';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

const FEATURES = [
  {
    title: 'Start free.',
    description: 'Up to 10k workflow runs every month at no cost.',
  },
  {
    title: 'Ship faster.',
    description: 'Integrate quickly with API-first tools and a drop-in Inbox.',
  },
  {
    title: 'Scale confidently.',
    description: 'Reliable multi-channel notifications with built-in observability.',
  },
];

const TRUSTED_COMPANIES = ['capgemini', 'hemnet', 'mongodb', 'siemens'];

export function Landing1SignUpPage() {
  const segment = useSegment();

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
      landing: 'landing-1',
    });
  }, []);

  return (
    <>
      <PageMeta title="Sign up" />
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <LeftPanel />
        <RightPanel />
      </div>
    </>
  );
}

function LeftPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-[#0e0e1a] px-6 py-8 text-white lg:w-1/2 lg:px-16 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(100,50,200,0.15),_transparent_60%)]" />

      <div className="relative z-10 flex flex-col gap-10">
        <img src="/images/novu-logo-dark.svg" className="w-24 brightness-0 invert" alt="Novu" />

        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight lg:text-[42px] lg:leading-[1.15]">
            Open-source notifications,
            <br />
            <span className="bg-gradient-to-r from-[#a855f7] to-[#6366f1] bg-clip-text text-transparent">
              live in minutes
            </span>
          </h1>
          <p className="text-sm text-neutral-400">No credit card required.</p>
        </div>

        <div className="flex flex-col gap-5">
          {FEATURES.map((feature) => (
            <FeatureBullet key={feature.title} title={feature.title} description={feature.description} />
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-10 flex flex-col gap-8">
        <Testimonial />
      </div>
    </div>
  );
}

function FeatureBullet({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-[#6366f1]" />
      <p className="text-sm leading-relaxed text-neutral-300">
        <span className="font-semibold text-white">{title}</span> {description}
      </p>
    </div>
  );
}

function Testimonial() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl leading-none text-neutral-600">&ldquo;</div>
      <p className="text-sm leading-relaxed text-neutral-400 italic">
        &ldquo;Novu&apos;s UI lets us handle configuration without reinventing the wheel, that&apos;s a huge savings on
        development and maintenance.&rdquo;
      </p>
      <p className="text-xs text-neutral-500">
        <span className="font-medium text-neutral-300">Tin Nguyen</span> — Lead Engineer at Unified
      </p>
    </div>
  );
}

function RightPanel() {
  return (
    <div className="flex flex-1 flex-col bg-white lg:w-1/2">
      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-16">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-5">
          <SignUpForm
            path={ROUTES.LANDING_1_SIGN_UP}
            signInUrl={ROUTES.SIGN_IN}
            appearance={clerkSignupAppearance}
            forceRedirectUrl={ROUTES.SIGNUP_ORGANIZATION_LIST}
          />
          {!IS_SELF_HOSTED && <RegionPicker />}
        </div>
      </div>

      <TrustedBySection />
    </div>
  );
}

function TrustedBySection() {
  return (
    <div className="flex flex-col items-center gap-4 border-t border-neutral-100 px-6 py-6">
      <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
        Trusted by top industry leaders
      </span>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {TRUSTED_COMPANIES.map((name) => (
          <img key={name} src={`/images/auth/${name}-customer.svg`} alt={name} className="h-5 opacity-60" />
        ))}
      </div>
    </div>
  );
}
