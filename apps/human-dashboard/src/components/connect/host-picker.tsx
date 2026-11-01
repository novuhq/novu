'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useId } from 'react';

import { HostLogo } from '@/components/connect/host-logo';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { HOST_GROUPS, HOSTS, type Host, type HostGroup, type HostId, hostOf, PICKER_RUNS } from '@/lib/hosts';
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
 * The hosts to choose from. In the dashboard, the design's `Platform picker`: a row of logo tiles in runs
 * (`PICKER_RUNS`), the chosen one outlined in orange with its name unfolded next to its logo, and each
 * other one named in a hint under the pointer. On a public page, small chips with their names in two groups,
 * the ones that run commands, then the chat apps (`HOST_GROUPS`). A host that has connected already carries a
 * green check mark.
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
    <TooltipProvider delayDuration={300}>
      <div
        role="radiogroup"
        aria-label="Where your agent runs"
        className={cn('flex flex-wrap items-center gap-1.5', className)}
      >
        {PICKER_RUNS.map((run, index) => (
          <Fragment key={run[0]}>
            {index > 0 && <span aria-hidden="true" className="h-4 w-px bg-[#2e2e2e]" />}
            {run.map((id) => (
              <HostTile
                key={id}
                host={hostOf(id)}
                name={name}
                selected={id === selected}
                connected={connected?.has(id) ?? false}
                onSelect={() => onSelect?.(id)}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </TooltipProvider>
  );
}

type HostTileProps = {
  host: Host;
  /** The radio group the tile's input belongs to. */
  name: string;
  selected: boolean;
  connected: boolean;
  onSelect: () => void;
};

/**
 * One host of the dashboard's picker: its logo on a 32px tile, dimmed until it's chosen. Choosing it outlines
 * the tile in orange and unfolds the host's name next to the logo, while the last one folds its name away.
 */
function HostTile({ host, name, selected, connected, onSelect }: HostTileProps) {
  return (
    <Tooltip label={host.name} disabled={selected}>
      <label
        className={cn(
          'group relative flex h-8 shrink-0 cursor-pointer items-center rounded-lg border p-1 transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none',
          'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
          selected ? 'border-accent bg-[#161616]' : 'border-[#2e2e2e] hover:border-[#3d3d3d]'
        )}
      >
        {/* One stop for Tab: the arrow keys move between the hosts and choose as they go. */}
        <input
          type="radio"
          name={name}
          value={host.id}
          checked={selected}
          onChange={onSelect}
          aria-label={connected ? `${host.name} (connected)` : host.name}
          className="sr-only"
        />
        <HostLogo
          host={host}
          size="tile"
          className={cn(
            'transition-opacity duration-200 ease-out motion-reduce:transition-none',
            !selected && 'opacity-75 group-hover:opacity-100'
          )}
        />
        {/* The name takes no room until the host is chosen, then opens to its own width. */}
        <span
          aria-hidden="true"
          className={cn(
            'grid transition-[grid-template-columns,opacity] duration-300 ease-out motion-reduce:transition-none',
            selected ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'
          )}
        >
          <span className="min-w-0 overflow-hidden">
            <span className="block pr-1.5 pl-1.5 text-xs leading-4 font-medium whitespace-nowrap text-foreground">
              {host.name}
            </span>
          </span>
        </span>
        {connected && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex size-3.5 animate-overlay-in items-center justify-center rounded-full bg-success ring-2 ring-background motion-reduce:animate-none"
          >
            <Check className="size-2 text-background" strokeWidth={4} />
          </span>
        )}
      </label>
    </Tooltip>
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
