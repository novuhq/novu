'use client';

import { Settings } from 'lucide-react';
import { useState } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { TelegramSetup } from '@/components/channels/telegram-setup';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import type { ChannelVia } from '@/lib/human-channels-api';
import type { TelegramSetupState } from '@/lib/human-telegram-setup';
import { cn } from '@/lib/utils';

export type ChannelRow = {
  via: ChannelVia;
  name: string;
  /** What the channel will give the agent, shown until it has handles of its own. */
  placeholder: string;
  /** How the agent is known on the channel once it's connected. Each one can be copied on its own. */
  handles: ChannelHandle[];
  connected: boolean;
};

export type ChannelHandle = {
  value: string;
  /** What the value is, for the copy button: "bot handle", "workspace". */
  label: string;
};

/** Channels whose setup drawer exists. The others are still set up with `human setup`. */
const HAS_SETUP: Partial<Record<ChannelVia, true>> = { telegram: true };

/** The agent's channels, one row each. A row opens the channel's setup drawer. */
export function ChannelsTable({ rows, telegramSetup }: { rows: ChannelRow[]; telegramSetup: TelegramSetupState }) {
  const [openSetup, setOpenSetup] = useState<ChannelVia | null>(null);

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Channel</TableHeaderCell>
            <TableHeaderCell className="w-35 px-0">Status</TableHeaderCell>
            <TableHeaderCell className="w-88">
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const hasSetup = HAS_SETUP[row.via] === true;

            return (
              <TableRow
                key={row.via}
                // The button in the row does the same for the keyboard; the row is the bigger target for a pointer.
                onClick={hasSetup ? () => setOpenSetup(row.via) : undefined}
                className={cn(hasSetup && 'cursor-pointer')}
              >
                <TableCell className="h-18">
                  <div className="flex items-center gap-3">
                    <ChannelIcon via={row.via} />
                    <div className="flex min-w-0 flex-col gap-0.75">
                      <span className="text-[13px] leading-4.5 font-medium">{row.name}</span>
                      <ChannelHandles row={row} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-35 px-0">
                  {row.connected ? <Badge variant="success">Connected</Badge> : <Badge>Not set up</Badge>}
                </TableCell>
                <TableCell className="w-88 text-right">
                  <RowAction row={row} hasSetup={hasSetup} onOpen={() => setOpenSetup(row.via)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TelegramSetup
        setup={telegramSetup}
        open={openSetup === 'telegram'}
        onOpenChange={(open) => setOpenSetup(open ? 'telegram' : null)}
      />
    </>
  );
}

/**
 * The line under a channel's name. Every handle gets its own copy button, which fades in while the
 * pointer is over that handle or the keyboard is on the button.
 */
function ChannelHandles({ row }: { row: ChannelRow }) {
  if (row.handles.length === 0) {
    return <span className="truncate font-mono text-[11px] leading-4 text-muted">{row.placeholder}</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] leading-4 text-muted">
      {row.handles.map((handle, index) => (
        <span key={handle.label} className="flex min-w-0 items-center gap-1.5">
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className="group/handle flex min-w-0 items-center gap-1">
            <span className="truncate">{handle.value}</span>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: only keeps the click from also opening the row's drawer */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: the button inside handles the keyboard */}
            <span className="flex" onClick={(event) => event.stopPropagation()}>
              <CopyButton
                value={handle.value}
                label={`Copy the ${row.name} ${handle.label}`}
                className="size-5 opacity-0 transition-[opacity,color,background-color] duration-200 ease-out group-hover/handle:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
              />
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

function RowAction({ row, hasSetup, onOpen }: { row: ChannelRow; hasSetup: boolean; onOpen: () => void }) {
  if (row.connected) {
    return hasSetup ? (
      <button
        type="button"
        aria-label={`Manage ${row.name}`}
        title={`Manage ${row.name}`}
        className={buttonClassName('ghost')}
        onClick={stopRowClick(onOpen)}
      >
        <Settings aria-hidden="true" className="size-4" />
      </button>
    ) : null;
  }

  if (!hasSetup) {
    return (
      <Button
        variant="secondary"
        className={SMALL_BUTTON}
        disabled
        title="Coming soon. For now, run human setup in your terminal."
      >
        Set up
      </Button>
    );
  }

  return (
    <Button variant="secondary" className={SMALL_BUTTON} onClick={stopRowClick(onOpen)}>
      Set up
    </Button>
  );
}

/** The row has the same click handler, so a click on the button would otherwise run it twice. */
function stopRowClick(handler: () => void) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    handler();
  };
}
