import { HEADER_NAVIGATION } from '@/data/sapien';
import { headerAssets } from '@/data/sapien-assets';

import { SectionDivider } from './section-divider';
import { SiteBrand } from './site-brand';
import { SiteMenu } from './site-menu';
import { SiteNavigation } from './site-navigation';

const NAVIGATION_LABEL = 'Header navigation';

export function SiteHeader() {
  return (
    // biome-ignore lint/correctness/useUniqueElementIds: the page's top as an anchor (#top), rendered once
    <header
      id="top"
      className="section-rails flex min-h-12.5 flex-wrap items-center justify-between gap-3 px-2.5 py-2 sm:p-2"
    >
      <SiteBrand icon={headerAssets.imgLogomarkConcept} />
      {/* Below sm the links move into the menu (mobile Figma 894:1303). */}
      <SiteNavigation items={HEADER_NAVIGATION} label={NAVIGATION_LABEL} className="max-sm:hidden" />
      <SiteMenu label={NAVIGATION_LABEL} className="sm:hidden" />
      <SectionDivider />
    </header>
  );
}
