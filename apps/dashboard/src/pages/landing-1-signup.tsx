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

const MARQUEE_LOGOS = [
  { src: '/images/customers/logo-mongodb.svg', alt: 'MongoDB', height: 22 },
  { src: '/images/customers/logo-unity.svg', alt: 'Unity', height: 20 },
  { src: '/images/customers/logo-capgemini.svg', alt: 'Capgemini', height: 24 },
  { src: '/images/customers/logo-siemens.svg', alt: 'Siemens', height: 24 },
  { src: '/images/customers/logo-roche.svg', alt: 'Roche', height: 22 },
  { src: '/images/customers/logo-hemnet.svg', alt: 'Hemnet', height: 22 },
  { src: '/images/customers/logo-checkpoint.svg', alt: 'Check Point', height: 22 },
  { src: '/images/customers/logo-sinch.svg', alt: 'Sinch', height: 18 },
  { src: '/images/customers/logo-korn-ferry.svg', alt: 'Korn Ferry', height: 18 },
  { src: '/images/customers/logo-unops.svg', alt: 'UNOPS', height: 20 },
];

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
      <PageMeta title="Sign up for Novu" />
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

      <div className="relative z-10 flex flex-col gap-6 lg:gap-10">
        <a href="https://novu.co" target="_blank" rel="noopener noreferrer">
          <img
            src="/images/novu-logo-color.svg"
            className="h-[36px] w-[116px] object-contain object-left lg:h-[44px] lg:w-[142px]"
            alt="Novu"
          />
        </a>

        <div className="flex flex-col gap-4 lg:mt-10 lg:gap-7">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.56px] sm:text-3xl lg:text-[48px] lg:leading-[1.125] lg:tracking-[-0.96px]">
            Open-source notifications, <span className="text-[#99b3ff]">live in minutes</span>
          </h1>
          <p className="text-base leading-normal tracking-[-0.32px] text-[#ccc] lg:text-lg lg:tracking-[-0.36px]">
            Build and ship multi-channel notifications fast with Novu&apos;s API-first platform and drop-in Inbox. No
            credit card required.
          </p>
        </div>

        <div className="hidden flex-col gap-5 sm:flex">
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

      <div className="relative z-10 mt-8 hidden sm:block lg:mt-10">
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
        <p className="text-base leading-normal tracking-[-0.32px] text-white lg:text-lg lg:tracking-[-0.36px]">
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
      <img
        src="/images/auth/quote-mark.svg"
        className="absolute -top-[30px] left-0 h-[45px] w-[65px] lg:-top-[35px] lg:left-[-16px] lg:h-[55px] lg:w-[80px]"
        alt=""
      />
      <p className="relative z-10 text-lg leading-normal tracking-[-0.36px] text-white lg:text-xl lg:tracking-[-0.4px]">
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
    <div className="relative flex min-h-[600px] flex-1 flex-col overflow-hidden bg-[#08080c] lg:min-h-0 lg:w-1/2">
      <RightPanelBackground />

      <div className="relative z-10 pt-6 lg:pt-16">
        <TrustedBySection />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-16">
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
    <div className="flex flex-col items-center gap-4 lg:gap-5">
      <span className="text-[10px] uppercase tracking-widest text-white/60 lg:text-xs">
        Trusted by top industry leaders
      </span>
      <LogoMarqueeRow logos={MARQUEE_LOGOS} direction="left" duration={50} />
    </div>
  );
}

function LogoMarqueeRow({
  logos,
  direction,
  duration,
}: {
  logos: { src: string; alt: string; height: number }[];
  direction: 'left' | 'right';
  duration: number;
}) {
  const repeated = [...logos, ...logos];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className="flex w-max items-center gap-10"
        style={{
          animation: `marquee-${direction} ${duration}s linear infinite`,
        }}
      >
        {repeated.map(({ src, alt, height }, index) => (
          <img
            key={`${alt}-${index}`}
            src={src}
            alt={alt}
            className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}
