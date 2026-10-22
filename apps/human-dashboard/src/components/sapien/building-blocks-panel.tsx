import {
  buildingBlocksAssets as assets,
  type BuildingBlockExample,
  type NotificationCard,
  type TerminalLine,
  type TerminalTone,
} from '@/data/sapien-building-blocks';

import { cn } from '@/lib/utils';

import { Artwork } from './artwork';

const tones: Record<TerminalTone, string> = {
  muted: 'text-sapien-foreground/50',
  accent: 'text-accent',
  bright: 'text-sapien-foreground',
};

// Below `lg` long lines wrap with a hanging indent. From `lg` up they stay on one
// line and, like Figma's clipped result line, scroll inside the terminal.
const scroller =
  'overflow-x-auto whitespace-pre-wrap wrap-break-word [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:whitespace-pre [&::-webkit-scrollbar]:hidden';

function TerminalText({ lines }: { lines: readonly TerminalLine[] }) {
  return (
    <code className="font-mono">
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="block pl-[4ch] -indent-[4ch]">
          {line.map((token, tokenIndex) => (
            <span key={tokenIndex} className={token.tone ? tones[token.tone] : undefined}>
              {token.text}
            </span>
          ))}
        </span>
      ))}
    </code>
  );
}

const buttonBase =
  'flex h-9 min-w-0 flex-1 items-center justify-center rounded-[7px] px-2 text-[13px] leading-4 font-medium tracking-[-0.01em] whitespace-nowrap';

function NotificationResponse({ response }: { response: NotificationCard['response'] }) {
  switch (response.kind) {
    case 'buttons':
      return (
        <div className="flex gap-2 pt-4">
          {response.buttons.map((button) => (
            <span
              key={button.label}
              className={cn(
                buttonBase,
                button.primary ? 'bg-sapien-foreground text-black' : 'bg-sapien-foreground/10 text-sapien-foreground'
              )}
            >
              {button.label}
            </span>
          ))}
        </div>
      );
    case 'reply':
      return (
        <div className="flex gap-2 pt-4">
          <span className="flex h-9 min-w-0 flex-1 items-center rounded-[7px] border border-sapien-foreground/10 px-3 text-[13px] leading-4 tracking-[-0.01em] text-sapien-foreground">
            <span className="truncate">{response.value}</span>
            <span className="ml-px h-4 w-px shrink-0 bg-accent" />
          </span>
          <span className={cn(buttonBase, 'flex-none bg-sapien-foreground px-4 text-black')}>{response.action}</span>
        </div>
      );
    case 'note':
      return <p className="pt-4 text-[13px] leading-4 tracking-[-0.01em] text-sapien-foreground/50">{response.text}</p>;
  }
}

export function BuildingBlocksPanel({ example }: { example: BuildingBlockExample }) {
  const { card } = example;
  return (
    <div className="grid gap-2 overflow-hidden rounded-[14px] bg-border/50 p-2 lg:h-88 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="flex min-h-63 min-w-0 flex-col justify-between gap-8 p-4 sm:p-6 lg:min-h-0">
        <pre className={cn(scroller, 'text-sm leading-[22px] tracking-[-0.01em] text-sapien-foreground')}>
          <TerminalText lines={example.command} />
        </pre>
        <div className="border-t border-sapien-foreground/9 pt-4">
          <pre className={cn(scroller, 'text-[13px] leading-[18px] tracking-[-0.03em] text-sapien-foreground/50')}>
            <TerminalText lines={[example.result]} />
          </pre>
        </div>
      </div>
      {/* Illustrative preview of what the human sees: the terminal already carries the content. */}
      <div
        aria-hidden="true"
        className="relative flex h-84 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-sapien-surface/40 px-4"
      >
        {/* Figma's own 2x render of the rotated, stretched dither layer: resampling the raw
            fill in the browser loses the grey tones Figma's downsampling produces. */}
        <Artwork
          asset={assets.texture}
          className="absolute top-[-17px] left-[calc(50%-339px)] h-[493px] w-[803px] mix-blend-difference"
        />
        <div className="relative mt-0.5 w-86 max-w-full rounded-[10px] border border-border bg-black p-4">
          <div className="flex flex-col gap-1.5">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[13px] leading-4 font-medium tracking-[-0.01em] text-sapien-foreground">
                {card.author}
              </span>
              <span className="text-[11px] leading-[14px] tracking-[-0.01em] text-sapien-foreground/50">
                {card.time}
              </span>
            </p>
            <p className="text-[15px] leading-5 tracking-[-0.01em] text-sapien-foreground">{card.message}</p>
          </div>
          <NotificationResponse response={card.response} />
        </div>
      </div>
    </div>
  );
}
