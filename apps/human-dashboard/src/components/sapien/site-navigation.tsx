import {
  CHANNELS_MENU_AGENTS_LABEL,
  CHANNELS_MENU_LABEL,
  HEADER_ACTIONS,
  HEADER_LINKS,
  NAVIGATION_CHANNELS,
  SOURCE_LINK,
} from '@/data/site-navigation';
import { cn } from '@/lib/utils';

import { SiteChannelsMenu } from './site-channels-menu';
import { NAVIGATION_LINK_CLASS, SiteButtonLink, SiteSourceLink } from './site-navigation-items';
import { SiteNavigationLink } from './site-navigation-link';

/**
 * The header's row from the `lg` breakpoint (Figma `1632:32067`): the channels menu and the pages 48px after
 * the logo, and the buttons at the far end. Below `lg` the same destinations are in the menu (`SiteMenu`).
 */
export function SiteNavigation({ label, className }: { label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn('flex min-w-0 flex-1 items-center justify-between gap-4 pl-12', className)}>
      <ul className="flex items-center gap-8">
        <li>
          <SiteChannelsMenu
            label={CHANNELS_MENU_LABEL}
            agentsLabel={CHANNELS_MENU_AGENTS_LABEL}
            channels={NAVIGATION_CHANNELS}
          />
        </li>
        {HEADER_LINKS.map((link) => (
          <li key={link.href}>
            <SiteNavigationLink href={link.href} className={NAVIGATION_LINK_CLASS}>
              {link.label}
            </SiteNavigationLink>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2.25">
        <SiteSourceLink link={SOURCE_LINK} />
        {HEADER_ACTIONS.map((link) => (
          <SiteButtonLink key={link.href} link={link} />
        ))}
      </div>
    </nav>
  );
}
