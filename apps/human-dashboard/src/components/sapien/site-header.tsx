import { headerAssets } from '@/data/sapien-assets';
import {
  CHANNELS_MENU_AGENTS_LABEL,
  CHANNELS_MENU_LABEL,
  HEADER_ACTIONS,
  HEADER_LINKS,
  NAVIGATION_CHANNELS,
  SOURCE_LINK,
} from '@/data/site-navigation';

import { SectionDivider } from './section-divider';
import { SiteBrand } from './site-brand';
import { SiteHeaderFocus } from './site-header-focus';
import { SiteMenu } from './site-menu';
import { SiteNavigation } from './site-navigation';

const NAVIGATION_LABEL = 'Header navigation';

/**
 * The website's header (Figma `1632:32067`): 50px, kept at the top of the window over a dimmed, blurred page,
 * between the column's rails. The divider stays its last child: the line under it, with a pin on each rail.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50">
      {/* The window's whole width, not the column's: what scrolls under the header dims beside the rails too. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-black/85 backdrop-blur-[6px]"
      />
      <div className="section-rails flex h-12.5 items-center px-2.5 sm:px-2">
        <SiteBrand icon={headerAssets.imgLogomarkConcept} />
        <SiteNavigation label={NAVIGATION_LABEL} className="max-lg:hidden" />
        {/* Below lg the destinations are in the menu: at md the row is already wider than the column. */}
        <SiteMenu
          label={NAVIGATION_LABEL}
          channelsLabel={CHANNELS_MENU_LABEL}
          agentsLabel={CHANNELS_MENU_AGENTS_LABEL}
          channels={NAVIGATION_CHANNELS}
          links={HEADER_LINKS}
          actions={HEADER_ACTIONS}
          source={SOURCE_LINK}
          className="ml-auto lg:hidden"
        />
      </div>
      <SiteHeaderFocus />
      <SectionDivider />
    </header>
  );
}
