import type { IconType } from 'react-icons';
import { RiArrowRightUpLine, RiBookMarkedLine, RiGithubLine, RiGroup2Line } from 'react-icons/ri';
import { docsUrl } from '@/components/header-navigation/support-drawer-constants';
import { LinkIcon } from '@/components/icons/link';

type ResourceLink = {
  label: string;
  href: string;
  icon: IconType;
};

const RESOURCE_LINKS: ResourceLink[] = [
  {
    label: 'Join our community',
    href: 'https://discord.novu.co',
    icon: RiGroup2Line,
  },
  {
    label: 'Read documentation',
    href: docsUrl('/platform/connect/overview'),
    icon: RiBookMarkedLine,
  },
  {
    label: 'See our code on GitHub',
    href: 'https://github.com/novuhq/novu',
    icon: RiGithubLine,
  },
];

export function ConnectResourcesSection() {
  return (
    <div className="flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 py-1.5 gap-1">
        <LinkIcon className="text-text-soft size-4" />
        <span className="text-text-soft text-code-xs font-code font-medium uppercase leading-4 tracking-wider">
          Quick links
        </span>
      </div>
      <ul className="bg-bg-white divide-stroke-soft flex flex-col divide-y rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {RESOURCE_LINKS.map((link) => {
          const Icon = link.icon;

          return (
            <li key={link.label} className="first:rounded-t-md last:rounded-b-md">
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
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
