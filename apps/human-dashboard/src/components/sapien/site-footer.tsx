import { footerAssets } from '@/data/sapien-assets';

import { SiteBrand } from './site-brand';
import { SiteNavigation } from './site-navigation';

/** Stacked below md (Figma mobile 895:1979), one 50px row from md. */
export function SiteFooter() {
  return (
    <footer className="section-rails flex flex-col items-start p-2.5 md:min-h-12.5 md:flex-row md:flex-wrap md:items-center md:gap-4 md:p-2">
      <SiteBrand icon={footerAssets.imgLogomarkConcept} />
      <p className="mt-3.5 flex gap-2 font-sapien-mono text-xs leading-none tracking-tight text-sapien-foreground/50 md:mt-0 md:ml-[7.5px] md:gap-4 md:text-sm md:leading-5">
        <span className="w-[42px] md:w-[49px]">© 2026</span>
        <span aria-hidden="true" className="w-2 opacity-50 md:w-[9px]">
          |
        </span>
        <a href="https://novu.co/" className="inline-flex items-center gap-1.5 text-accent">
          <NovuMark className="size-3.5" />
          built by novu
        </a>
      </p>
      <SiteNavigation
        label="Footer navigation"
        className="mt-[38px] grid w-full grid-cols-3 gap-1 md:mt-0 md:ml-auto md:flex md:w-auto md:gap-2 max-md:[&>a]:px-0"
      />
    </footer>
  );
}

/** The Novu mark only, cropped from the wordmark in `public/illustrations/novu-logo.svg`. */
function NovuMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="119.801 996 19.75 20" className={className} fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M135.008 1004.02C135.008 1004.55 134.363 1004.82 133.992 1004.44L126.389 996.567C127.417 996.2 128.523 996 129.675 996C131.64 996 133.47 996.581 135.008 997.582V1004.02ZM137.773 1000.27V1004.02C137.773 1007.06 134.12 1008.57 132.015 1006.39L123.84 997.932C121.391 999.752 119.801 1002.69 119.801 1006C119.801 1008.13 120.458 1010.1 121.578 1011.73V1008C121.578 1004.96 125.231 1003.45 127.335 1005.63L135.5 1014.08C137.955 1012.26 139.55 1009.32 139.55 1006C139.55 1003.87 138.893 1001.9 137.773 1000.27ZM125.359 1007.58L132.947 1015.44C131.923 1015.8 130.822 1016 129.675 1016C127.711 1016 125.881 1015.42 124.343 1014.42V1008C124.343 1007.47 124.988 1007.2 125.359 1007.58Z"
        fill="url(#novu-mark-a)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M135.008 1004.02C135.008 1004.55 134.363 1004.82 133.992 1004.44L126.389 996.567C127.417 996.2 128.523 996 129.675 996C131.64 996 133.47 996.581 135.008 997.582V1004.02ZM137.773 1000.27V1004.02C137.773 1007.06 134.12 1008.57 132.015 1006.39L123.84 997.932C121.391 999.752 119.801 1002.69 119.801 1006C119.801 1008.13 120.458 1010.1 121.578 1011.73V1008C121.578 1004.96 125.231 1003.45 127.335 1005.63L135.5 1014.08C137.955 1012.26 139.55 1009.32 139.55 1006C139.55 1003.87 138.893 1001.9 137.773 1000.27ZM125.359 1007.58L132.947 1015.44C131.923 1015.8 130.822 1016 129.675 1016C127.711 1016 125.881 1015.42 124.343 1014.42V1008C124.343 1007.47 124.988 1007.2 125.359 1007.58Z"
        fill="url(#novu-mark-b)"
      />
      <defs>
        <radialGradient
          id="novu-mark-a"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-9.87461 10 -9.87461 -10 129.675 1006)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.34" stopColor="#FF006A" />
          <stop offset="0.613" stopColor="#E300BD" />
          <stop offset="0.767" stopColor="#FF4CE1" />
        </radialGradient>
        <linearGradient
          id="novu-mark-b"
          x1="131.979"
          y1="995.333"
          x2="129.617"
          y2="1015.99"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.085" stopColor="#FFBA33" />
          <stop offset="0.553" stopColor="#FF006A" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
