import type { IconType } from 'react-icons';
import {
  RiArrowRightUpLine,
  RiBookletFill,
  RiBookletLine,
  RiBuildingLine,
  RiCalendarScheduleLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiGithubLine,
  RiGroup2Fill,
} from 'react-icons/ri';
import { BOOK_DEMO_URL, docsUrl } from '@/components/header-navigation/support-drawer-constants';
import { BotIcon } from '@/components/icons/bot';
import { LinkIcon } from '@/components/icons/link';
import { useTelemetry } from '@/hooks/use-telemetry';
import { AGENTS_DOCS_OVERVIEW_URL } from '@/utils/agent-docs';
import { TelemetryEvent } from '@/utils/telemetry';

type SidebarLink = {
  label: string;
  href: string;
  icon: IconType;
};

const QUICK_LINKS: SidebarLink[] = [
  { label: 'Join our community', href: 'https://discord.novu.co', icon: RiGroup2Fill },
  { label: 'Book a demo (Yes, with a human)', href: BOOK_DEMO_URL, icon: RiCalendarScheduleLine },
  { label: 'Read documentation', href: docsUrl(), icon: RiBookletLine },
  { label: 'See our code on GitHub', href: 'https://github.com/novuhq/novu', icon: RiGithubLine },
];

const LEARN_LINKS: SidebarLink[] = [
  { label: 'Agents', href: AGENTS_DOCS_OVERVIEW_URL, icon: BotIcon },
  { label: 'Environments', href: docsUrl('/platform/concepts/environments'), icon: RiDatabase2Line },
  {
    label: 'Contexts',
    href: docsUrl('/platform/workflow/advanced-features/contexts/contexts-in-workflows'),
    icon: RiBuildingLine,
  },
  { label: 'Framework', href: docsUrl('/framework/overview'), icon: RiCodeSSlashLine },
];

function SidebarSection({
  title,
  titleIcon: TitleIcon,
  links,
}: {
  title: string;
  titleIcon: IconType;
  links: SidebarLink[];
}) {
  const telemetry = useTelemetry();

  return (
    <div className="flex flex-col rounded-[10px] p-1">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <TitleIcon className="text-text-soft size-4" aria-hidden />
        <span className="text-text-soft text-code-xs font-code font-medium uppercase leading-4 tracking-wider">
          {title}
        </span>
      </div>
      <ul className="bg-bg-white divide-stroke-soft flex flex-col divide-y rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <li key={link.label} className="first:rounded-t-md last:rounded-b-md">
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  telemetry(TelemetryEvent.RESOURCE_CLICKED, { title: link.label, url: link.href, section: title })
                }
                className="hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:ring-stroke-strong group flex w-full items-center gap-2 rounded-md px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
              >
                <Icon className="text-text-sub size-4 shrink-0" aria-hidden />
                <span className="text-text-sub text-label-sm flex-1 truncate font-medium">{link.label}</span>
                <RiArrowRightUpLine
                  className="text-text-soft size-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WelcomeSidebar() {
  return (
    <aside className="flex flex-col gap-2.5">
      <SidebarSection title="Quick links" titleIcon={LinkIcon} links={QUICK_LINKS} />
      <SidebarSection title="Learn" titleIcon={RiBookletFill} links={LEARN_LINKS} />
    </aside>
  );
}
