'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';

import { HostLogo } from '@/components/connect/host-logo';
import { HOST_GROUPS, HOSTS, type Host, type HostGroup, type HostId } from '@/lib/hosts';
import { cn } from '@/lib/utils';

type HostPickerProps = {
  selected: HostId;
  /**
   * The hosts that connected already, which get a check mark. Today that's the chat apps (and Cursor) that
   * signed in to the MCP server (`connectedTools`); once the API tells every host apart, all of them.
   */
  connected?: ReadonlySet<HostId>;
  className?: string;
} & (
  | {
      /** The dashboard: a choice between the hosts, which the arrow keys move as in any radio group. */
      onSelect: (id: HostId) => void;
      hrefOf?: never;
    }
  | {
      /** A public page: each host is a link to its own page. */
      hrefOf: (id: HostId) => string;
      onSelect?: never;
    }
);

const CHIP =
  'relative inline-flex h-7 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] leading-4.5 whitespace-nowrap transition-[background-color,border-color,color] duration-200 ease-out motion-reduce:transition-none';

const GROUP_LABEL = 'font-mono text-[11px] leading-4 font-medium text-muted uppercase';

/** The chosen host is raised; the rest are outlined and brighten under the pointer. */
function chipLook(selected: boolean): string {
  return cn(
    CHIP,
    selected
      ? 'border-border-strong bg-raised text-foreground'
      : 'border-border text-secondary hover:border-border-strong hover:text-foreground'
  );
}

/**
 * The hosts, as small chips with their logos, in two groups: the ones that run commands, then the chat apps
 * (`HOST_GROUPS`). The chosen one is raised; switching fades its look across to the next. A host that has
 * connected already carries a green check mark.
 */
export function HostPicker({ selected, connected, className, onSelect, hrefOf }: HostPickerProps) {
  const name = useId();

  if (hrefOf) {
    return (
      <nav aria-label="Agent Inbox for each host" className={cn('flex flex-col gap-3', className)}>
        {HOST_GROUPS.map(({ group, label }) => (
          <div key={group} className="flex flex-col gap-2">
            <p className={GROUP_LABEL}>{label}</p>
            <ul className="flex flex-wrap gap-1.5">
              {hostsOf(group).map((host) => (
                <li key={host.id} className="flex">
                  <Link
                    href={hrefOf(host.id)}
                    aria-current={host.id === selected ? 'page' : undefined}
                    className={cn(chipLook(host.id === selected), 'focus-visible:outline-offset-2')}
                  >
                    <ChipContent host={host} connected={connected?.has(host.id) ?? false} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div role="radiogroup" aria-label="Where your agent runs" className={cn('flex flex-col gap-3', className)}>
      {HOST_GROUPS.map(({ group, label }) => (
        // biome-ignore lint/a11y/useSemanticElements: a fieldset can't lay its chips out with flex in every browser
        <div key={group} role="group" aria-labelledby={`${name}-${group}`} className="flex flex-col gap-2">
          <p id={`${name}-${group}`} className={GROUP_LABEL}>
            {label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hostsOf(group).map((host) => {
              const isSelected = host.id === selected;

              return (
                <label
                  key={host.id}
                  className={cn(
                    chipLook(isSelected),
                    'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent'
                  )}
                >
                  {/* One stop for Tab: the arrow keys move between the hosts, across both groups, and choose as they go. */}
                  <input
                    type="radio"
                    name={name}
                    value={host.id}
                    checked={isSelected}
                    onChange={() => onSelect?.(host.id)}
                    className="sr-only"
                  />
                  <ChipContent host={host} connected={connected?.has(host.id) ?? false} />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function hostsOf(group: HostGroup): Host[] {
  return HOSTS.filter((host) => host.group === group);
}

function ChipContent({ host, connected }: { host: Host; connected: boolean }) {
  return (
    <>
      <HostLogo host={host} size="small" />
      {host.name}
      {/* Fades in once the host connects, while the page reloads with it. */}
      {connected && (
        <span className="flex animate-overlay-in items-center motion-reduce:animate-none">
          <Check aria-hidden="true" className="size-3 text-success" strokeWidth={2.5} />
          <span className="sr-only">(connected)</span>
        </span>
      )}
    </>
  );
}
