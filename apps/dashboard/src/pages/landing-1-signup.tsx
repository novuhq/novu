import { SignUp as SignUpForm } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { clerkLandingSignupAppearance } from '@/utils/clerk-appearance';
import { ROUTES } from '@/utils/routes';
import { IS_SELF_HOSTED } from '../config';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

const FEATURES = [
  {
    title: 'Start free.',
    description: 'Up to 10k workflow runs every month at no cost.',
    icon: '/images/auth/icon-spaceship.svg',
  },
  {
    title: 'Ship faster.',
    description: 'Integrate quickly with API-first tools and a drop-in Inbox.',
    icon: '/images/auth/icon-arrows-maximize.svg',
  },
  {
    title: 'Stay flexible.',
    description: 'Open-source infrastructure that you can customize, extend, and control.',
    icon: '/images/auth/icon-setup-preferences.svg',
  },
  {
    title: 'Scale confidently.',
    description: 'Reliable multi-channel notifications with built-in observability.',
    icon: '/images/auth/icon-camera-flash.svg',
  },
];

const TRUSTED_COMPANIES = [
  { name: 'capgemini', width: 105 },
  { name: 'hemnet', width: 94 },
  { name: 'mongodb', width: 100 },
  { name: 'siemens', width: 78 },
  { name: 'unity', width: 76 },
];

const GITHUB_URL = 'https://github.com/novuhq/novu';
const DOCS_URL = 'https://docs.novu.co';

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
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div
        className="flex min-h-screen w-full flex-col lg:flex-row"
        style={{ fontFamily: "'brother-1816', sans-serif", fontWeight: 300 }}
      >
        <LeftPanel />
        <RightPanel />
      </div>
    </>
  );
}

function LeftPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-[#05050b] px-6 py-8 text-white lg:w-1/2 lg:px-16 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(100,50,200,0.15),transparent_60%)]" />

      <div className="relative z-10 flex flex-col gap-10">
        <img src="/images/novu-logo-color.svg" className="h-[44px] w-[142px] object-contain object-left" alt="Novu" />

        <div className="flex flex-col gap-7 mt-10">
          <h1 className="text-3xl font-medium leading-tight tracking-[-0.96px] lg:text-[48px] lg:leading-[1.125]">
            Open-source notifications, <span className="text-[#99b3ff]">live in minutes</span>
          </h1>
          <p className="text-lg leading-normal tracking-[-0.36px] text-[#ccc]">
            Build and ship multi-channel notifications fast with Novu&apos;s API-first platform and drop-in Inbox. No
            credit card required.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {FEATURES.map((feature, index) => (
            <FeatureBullet
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              isLast={index === FEATURES.length - 1}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-10">
        <Testimonial />
      </div>
    </div>
  );
}

function FeatureBullet({
  title,
  description,
  icon,
  isLast,
}: {
  title: string;
  description: string;
  icon: string;
  isLast: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3.5">
        <img src={icon} className="size-4 shrink-0" alt="" />
        <p className="text-lg leading-normal tracking-[-0.36px] text-white">
          <span className="font-medium">{title}</span> {description}
        </p>
      </div>
      {!isLast && <div className="h-px w-full bg-linear-to-r from-white/10 via-white/5 to-transparent" />}
    </>
  );
}

function Testimonial() {
  return (
    <div className="relative flex flex-col gap-5">
      <img src="/images/auth/quote-mark.svg" className="absolute -top-[35px] left-[-16px] h-[55px] w-[80px]" alt="" />
      <p className="relative z-10 text-xl leading-normal tracking-[-0.4px] text-white">
        Novu&apos;s UI lets us handle configuration without reinventing the wheel, that&apos;s a huge savings on
        development and maintenance.
      </p>
      <div className="flex items-center gap-3">
        <img src="/images/auth/avatar-tin-nguyen.png" className="size-10 rounded-full" alt="Tin Nguyen" />
        <div className="flex flex-col gap-1">
          <p className="text-[15px] leading-snug tracking-[-0.3px] text-white/80">
            <span className="font-medium text-white">Tin Nguyen</span>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-snug tracking-[-0.28px] text-white/50">Lead Engineer at</span>
            <img
              src="/images/auth/unified-logo.svg"
              className="h-[17px] w-[65px] object-contain opacity-70"
              alt="Unified"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#08080c] lg:w-1/2">
      <RightPanelBackground />

      <div className="relative z-10 pt-8 lg:pt-16">
        <TrustedBySection />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 lg:px-16">
        <div className="flex w-full max-w-[512px] flex-col items-center gap-5">
          <SignUpForm
            path={ROUTES.LANDING_1_SIGN_UP}
            signInUrl={ROUTES.SIGN_IN}
            appearance={clerkLandingSignupAppearance}
            forceRedirectUrl={ROUTES.SIGNUP_ORGANIZATION_LIST}
          />
          {!IS_SELF_HOSTED && (
            <div className="**:border-white/15! [&_.text-neutral-400]:text-white/45! [&_.text-foreground-300]:text-white/30! [&_button]:bg-transparent! [&_button]:text-white/60!">
              <RegionPicker />
            </div>
          )}
        </div>
      </div>

      {/*  <div className="relative z-10 pb-10">
        <ExploreNovuSection />
      </div> */}
    </div>
  );
}

function RightPanelBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-[20%] -top-[10%] h-[80%] w-[80%] opacity-90"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(160, 50, 180, 0.35), rgba(120, 40, 160, 0.15) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute -right-[10%] top-[15%] h-[90%] w-[90%] opacity-90"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(60, 80, 200, 0.3), rgba(50, 60, 180, 0.12) 45%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-0 left-[20%] h-[50%] w-[60%] opacity-70"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(40, 50, 160, 0.25), transparent 65%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: "url('/images/auth/noise-texture.png')",
          backgroundSize: '1024px 1024px',
        }}
      />
    </div>
  );
}

function TrustedBySection() {
  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <span className="text-xs uppercase tracking-widest text-white/60">Trusted by top industry leaders</span>
      <div
        className="flex items-center justify-center gap-12"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        }}
      >
        {TRUSTED_COMPANIES.map(({ name, width }) => (
          <img
            key={name}
            src={`/images/auth/${name}-customer.svg`}
            alt={name}
            className="h-7 shrink-0"
            style={{ width }}
          />
        ))}
      </div>
    </div>
  );
}

function ExploreNovuSection() {
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-xl font-medium tracking-[-0.4px] text-white">Explore Novu</p>
      <div className="flex items-center gap-5">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-white px-5 py-[15px] text-[13px] font-medium uppercase leading-none text-black"
        >
          Star on Github
        </a>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-white/20 px-5 py-[15px] text-[13px] font-medium uppercase leading-none text-white"
          style={{
            backgroundImage: 'linear-gradient(234deg, rgba(176, 166, 191, 0.06) 8.6%, rgba(176, 166, 191, 0.03) 114%)',
          }}
        >
          Read our docs
        </a>
      </div>
    </div>
  );
}
