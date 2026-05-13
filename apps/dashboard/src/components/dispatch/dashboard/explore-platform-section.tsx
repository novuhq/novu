import { useId } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { PlatformIcon } from '@/components/icons/platform';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

export function ExplorePlatformSection() {
  const { currentEnvironment } = useEnvironment();
  const environmentSlug = currentEnvironment?.slug;
  const platformHref = environmentSlug ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug }) : ROUTES.ROOT;
  const reactId = useId();
  const gridId = `${reactId}-grid`;
  const gridMaskId = `${reactId}-grid-mask`;
  const gridFadeId = `${reactId}-grid-fade`;
  const glowId = `${reactId}-glow`;

  return (
    <div className="border-stroke-soft relative isolate flex flex-col gap-3 overflow-hidden rounded-lg border p-3">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 size-full"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={gridId} width="21" height="21" patternUnits="userSpaceOnUse">
            <rect x="0.5" y="0.5" width="20" height="20" fill="#fb3748" fillOpacity="0.06" />
          </pattern>
          <radialGradient id={gridMaskId} cx="100%" cy="0%" r="110%" fx="100%" fy="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="55%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={gridFadeId}>
            <rect width="100%" height="100%" fill={`url(#${gridMaskId})`} />
          </mask>
          <radialGradient id={glowId} cx="100%" cy="0%" r="120%" fx="100%" fy="0%">
            <stop offset="0%" stopColor="#fb3748" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#ff512f" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ff512f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${glowId})`} />
        <rect width="100%" height="100%" fill={`url(#${gridId})`} mask={`url(#${gridFadeId})`} />
      </svg>

      <div className="flex flex-col items-start gap-2">
        <span className="bg-primary-alpha-10 inline-flex items-center gap-0.5 rounded-[4px] border border-[rgba(251,55,72,0.05)] py-0.5 pl-[3px] pr-[5px]">
          <PlatformIcon className="size-3.5 text-[#dd2476]" aria-hidden />
          <span className="font-code text-code-xs bg-linear-to-r from-[#dd2476] to-[#ff512f] bg-clip-text font-medium uppercase leading-4 tracking-tight text-transparent">
            Platform
          </span>
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-text-sub text-label-sm font-medium leading-5">
            Building for your customers, not just your team?
          </p>
          <p className="text-text-soft text-paragraph-xs leading-4">
            Platform lets you embed Novu agents and notifications directly inside your own product. Same infrastructure.
          </p>
        </div>
      </div>

      <Link
        to={platformHref}
        className="border border-bg-soft bg-bg-white hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:ring-stroke-strong text-text-sub group flex w-full items-center justify-center gap-0.5 rounded-md py-1.5 pl-2 pr-1.5 text-label-xs font-medium shadow-[0px_0px_0px_1px_var(--stroke-soft),0px_1px_3px_0px_rgba(14,18,27,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <span>Explore</span>
        <span className="flex items-center gap-1 px-1">
          <PlatformIcon className="text-text-sub size-4" aria-hidden />
          <span>Platform</span>
        </span>
        <RiArrowRightSLine
          className="text-text-soft size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}
