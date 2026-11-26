import { footerAssets } from '@/data/sapien-assets';
import { FOOTER_LINKS, SOURCE_LINK } from '@/data/site-navigation';

import { SiteBrand } from './site-brand';
import { SiteButtonLink, SiteSourceLink } from './site-navigation-items';

/**
 * The website's footer (Figma `1632:32405`): the logo with the package, the page for agents and the source
 * beside it, and the copyright at the far end. One row wherever it fits, which is from about 610px: 50px tall
 * and 9px from its rails from md, as drawn. Narrower, the copyright moves under the row, and under about 415px
 * the buttons move under the logo. The row starts under the line that closes the section above.
 */
export function SiteFooter() {
  return (
    <footer className="section-rails mt-px flex flex-wrap items-center justify-between gap-x-4 gap-y-3.5 p-2.5 md:min-h-12.5 md:px-[9px] md:py-2">
      <div className="flex flex-wrap items-center gap-2">
        <SiteBrand icon={footerAssets.imgLogomarkConcept} />
        <nav aria-label="Footer navigation" className="flex items-center gap-2">
          {FOOTER_LINKS.map((link) => (
            <SiteButtonLink key={link.href} link={link} />
          ))}
          <SiteSourceLink link={SOURCE_LINK} />
        </nav>
      </div>
      <p className="flex flex-wrap gap-2 font-sapien-mono text-xs leading-none tracking-tight text-sapien-foreground/50 md:gap-4 md:text-sm md:leading-5">
        <span className="w-[42px] md:w-[49px]">© 2026</span>
        <span aria-hidden="true" className="w-2 opacity-50 md:w-[9px]">
          |
        </span>
        <a href="https://novu.co/" className="inline-flex items-center gap-1.5 text-accent">
          <NovuMark className="size-3.5" />
          built by novu
        </a>
      </p>
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
