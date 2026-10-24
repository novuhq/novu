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
        <a href="https://novu.co/" className="text-accent">
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
