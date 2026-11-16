import { HEADER_NAVIGATION, type NavigationItem } from '@/data/sapien';
import { headerAssets } from '@/data/sapien-assets';

import { SectionDivider } from './section-divider';
import { SiteBrand } from './site-brand';
import { SiteMenu } from './site-menu';
import { SiteNavigation } from './site-navigation';

const NAVIGATION_LABEL = 'Header navigation';

export function SiteHeader({ items = HEADER_NAVIGATION }: { items?: readonly NavigationItem[] }) {
  return (
    // biome-ignore lint/correctness/useUniqueElementIds: the page's top as an anchor (#top), rendered once
    <header
      id="top"
      className="section-rails flex min-h-12.5 flex-wrap items-center justify-between gap-3 px-2.5 py-2 sm:p-2"
    >
      <SiteBrand icon={headerAssets.imgLogomarkConcept} />
      {/* Below md the links move into the menu (mobile Figma 894:1303): five of them no longer fit one row. */}
      <SiteNavigation items={items} label={NAVIGATION_LABEL} className="max-md:hidden" />
      <SiteMenu items={items} label={NAVIGATION_LABEL} className="md:hidden" />
      <SectionDivider />
    </header>
  );
}
