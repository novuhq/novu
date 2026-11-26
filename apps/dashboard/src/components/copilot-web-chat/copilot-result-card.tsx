import type {
  CopilotChecklistItem,
  CopilotResultAction,
  CopilotResultCard,
  CopilotResultChartCard,
  CopilotResultChecklistCard,
  CopilotResultListCard,
  CopilotResultListItem,
  CopilotResultTone,
} from '@novu/shared';
import type { MouseEvent, ReactNode } from 'react';
import {
  RiArrowRightSLine,
  RiArrowRightUpLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiErrorWarningFill,
} from 'react-icons/ri';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button, buttonVariants } from '@/components/primitives/button';
import { type ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from '@/components/primitives/chart';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { isDashboardLink } from './copilot-web-chat-utils';
import { useOpenCopilotLink } from './use-open-copilot-link';

const TONE_STYLES: Record<CopilotResultTone, string> = {
  success: 'bg-success-base/10 text-success-base',
  warning: 'bg-warning-base/10 text-warning-base',
  error: 'bg-error-base/10 text-error-base',
  neutral: 'bg-bg-weak text-text-sub',
};

const CHECK_STATUS: Record<
  CopilotChecklistItem['status'],
  { icon: typeof RiCheckboxCircleFill; className: string; label: string }
> = {
  pass: { icon: RiCheckboxCircleFill, className: 'text-success-base', label: 'Passes' },
  warning: { icon: RiErrorWarningFill, className: 'text-warning-base', label: 'Needs a look' },
  fail: { icon: RiCloseCircleFill, className: 'text-error-base', label: 'Fails' },
};

// The analytics charts' palette.
const SERIES_COLORS = ['#818cf8', '#22d3ee', '#34d399', '#fbbf24'];

const COMPACT_NUMBER = new Intl.NumberFormat('en', { notation: 'compact' });

const LINK_BUTTON = buttonVariants({ variant: 'secondary', mode: 'outline', size: '2xs' }).root;

const ROW_FOCUS =
  'outline-none focus-visible:bg-bg-weak focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-stroke-strong';

type ResultActions = {
  canAsk: boolean;
  ask: (text: string) => void;
  /** A dashboard link, or `undefined` for one the card must not open. */
  linkOf: (url: string | undefined) => string | undefined;
  open: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
};

function useResultActions(cardType: CopilotResultCard['type']): ResultActions {
  const { sendMessage, isBusy, surface, pageContext } = useCopilotWebChat();
  const openLink = useOpenCopilotLink();
  const track = useTelemetry();
  const page = pageContext?.page;

  return {
    canAsk: !isBusy,
    ask: (text) => {
      track(TelemetryEvent.COPILOT_RESULT_ACTION_CLICKED, { cardType, opens: 'copilot', surface, page });
      void sendMessage(text);
    },
    linkOf: (url) => (url && isDashboardLink(url, window.location.origin) ? url : undefined),
    open: (event, url) => {
      // A modified click opens the link the browser's way, such as in a new tab.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

      event.preventDefault();
      if (openLink(url))
        track(TelemetryEvent.COPILOT_RESULT_ACTION_CLICKED, { cardType, opens: 'page', surface, page });
    },
  };
}

function ResultCardShell({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      // `overflow-hidden` would otherwise let the thread's scrolling column shrink the card.
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-stroke-soft bg-bg-white shadow-xs"
    >
      <header className="flex items-center gap-2 border-b border-stroke-weak bg-bg-weak px-3 py-2">
        <p title={title} className="min-w-0 flex-1 truncate text-xs font-medium leading-4 text-text-strong">
          {title}
        </p>
        {meta && <span className="shrink-0 text-xs leading-4 text-text-soft">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: NonNullable<CopilotResultListItem['status']> }) {
  return (
    <span className={cn('shrink-0 rounded px-1.5 text-[10px] font-medium leading-4', TONE_STYLES[status.tone])}>
      {status.label}
    </span>
  );
}

function ListRow({ item, actions }: { item: CopilotResultListItem; actions: ResultActions }) {
  const href = actions.linkOf(item.url);
  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium leading-4 text-text-strong">{item.title}</span>
        {item.description && <span className="truncate text-xs leading-4 text-text-soft">{item.description}</span>}
      </span>
      {item.status && <StatusBadge status={item.status} />}
    </>
  );
  const { ask } = item;

  if (ask) {
    return (
      <li className="flex items-center">
        <button
          type="button"
          title={ask}
          disabled={!actions.canAsk}
          onClick={() => actions.ask(ask)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 text-left hover:bg-bg-weak disabled:cursor-not-allowed disabled:opacity-60',
            href ? 'pr-1' : 'pr-2.5',
            ROW_FOCUS
          )}
        >
          {content}
          <RiArrowRightSLine className="size-3.5 shrink-0 text-text-soft" aria-hidden />
        </button>
        {href && (
          <a
            href={href}
            aria-label={`Open ${item.title}`}
            title={`Open ${item.title}`}
            onClick={(event) => actions.open(event, href)}
            className={cn(
              'flex self-stretch items-center px-2.5 text-text-soft hover:bg-bg-weak hover:text-text-sub',
              ROW_FOCUS
            )}
          >
            <RiArrowRightUpLine className="size-3.5" aria-hidden />
          </a>
        )}
      </li>
    );
  }

  if (href) {
    return (
      <li>
        <a
          href={href}
          onClick={(event) => actions.open(event, href)}
          className={cn('flex items-center gap-2 py-2 pl-3 pr-2.5 hover:bg-bg-weak', ROW_FOCUS)}
        >
          {content}
          <RiArrowRightUpLine className="size-3.5 shrink-0 text-text-soft" aria-hidden />
        </a>
      </li>
    );
  }

  return <li className="flex items-center gap-2 py-2 pl-3 pr-2.5">{content}</li>;
}

function ListCard({ card }: { card: CopilotResultListCard }) {
  const actions = useResultActions(card.type);

  return (
    <ResultCardShell title={card.title}>
      <ul className="flex flex-col divide-y divide-stroke-weak">
        {card.items.map((item, index) => (
          <ListRow key={`${item.title}:${index}`} item={item} actions={actions} />
        ))}
      </ul>
    </ResultCardShell>
  );
}

function FixButton({ fix, actions }: { fix: CopilotResultAction; actions: ResultActions }) {
  if ('ask' in fix) {
    return (
      <Button
        type="button"
        size="2xs"
        variant="secondary"
        mode="outline"
        title={fix.ask}
        disabled={!actions.canAsk}
        onClick={() => actions.ask(fix.ask)}
        className="shrink-0"
      >
        {fix.label}
      </Button>
    );
  }

  const href = actions.linkOf(fix.url);
  if (!href) return null;

  // Styled as the button rather than `Button asChild`, whose Slot renders nothing for a plain child.
  return (
    <a
      href={href}
      onClick={(event) => actions.open(event, href)}
      className={LINK_BUTTON({ class: 'relative flex shrink-0 items-center justify-center gap-1' })}
    >
      {fix.label}
    </a>
  );
}

function ChecklistCard({ card }: { card: CopilotResultChecklistCard }) {
  const actions = useResultActions(card.type);
  const passing = card.items.filter((item) => item.status === 'pass').length;

  return (
    <ResultCardShell title={card.title} meta={`${passing} of ${card.items.length} pass`}>
      <ul className="flex flex-col divide-y divide-stroke-weak">
        {card.items.map((item, index) => {
          const status = CHECK_STATUS[item.status];
          const Icon = status.icon;

          return (
            <li key={`${item.label}:${index}`} className="flex items-start gap-2 py-2 pl-3 pr-2.5">
              <Icon className={cn('mt-px size-3.5 shrink-0', status.className)} aria-label={status.label} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-medium leading-4 text-text-strong">{item.label}</span>
                {item.description && <span className="text-xs leading-4 text-text-soft">{item.description}</span>}
              </span>
              {item.fix && <FixButton fix={item.fix} actions={actions} />}
            </li>
          );
        })}
      </ul>
    </ResultCardShell>
  );
}

function ChartCard({ card }: { card: CopilotResultChartCard }) {
  const config: ChartConfig = Object.fromEntries(
    card.series.map((series, index) => [`s${index}`, { label: series.name, color: SERIES_COLORS[index] }])
  );
  const data = card.categories.map((category, categoryIndex) => ({
    category,
    ...Object.fromEntries(card.series.map((series, index) => [`s${index}`, series.values[categoryIndex]])),
  }));
  const tick = { fill: 'hsl(var(--text-soft))', fontSize: 10 };
  const isBar = card.chart === 'bar';
  // A bar names every category, cut to fit; a line over time skips labels that would overlap.
  const maxLabelLength = Math.max(4, Math.floor(48 / card.categories.length));
  const formatCategory = (value: string) =>
    isBar && value.length > maxLabelLength ? `${value.slice(0, maxLabelLength - 1)}…` : value;
  // An array, not a fragment: Recharts finds its axes among the chart's direct children.
  const axes = [
    <CartesianGrid key="grid" vertical={false} strokeDasharray="3 3" stroke="hsl(var(--stroke-soft))" />,
    <XAxis
      key="x"
      dataKey="category"
      tickLine={false}
      axisLine={false}
      tickMargin={6}
      minTickGap={8}
      interval={isBar ? 0 : 'preserveStartEnd'}
      tickFormatter={formatCategory}
      tick={tick}
    />,
    <YAxis
      key="y"
      width={32}
      tickLine={false}
      axisLine={false}
      allowDecimals={false}
      tickCount={4}
      interval={0}
      tickFormatter={(value: number) => COMPACT_NUMBER.format(value)}
      tick={tick}
    />,
    <ChartTooltip key="tooltip" cursor={false} content={<NovuTooltip showTotal={false} />} />,
  ];

  return (
    <ResultCardShell title={card.title}>
      <div className="flex flex-col gap-2 p-3 pl-1">
        <ChartContainer config={config} className="aspect-auto h-40 w-full">
          {isBar ? (
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              {axes}
              {card.series.map((series, index) => (
                <Bar
                  key={`s${index}`}
                  name={series.name}
                  dataKey={`s${index}`}
                  fill={`var(--color-s${index})`}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              {axes}
              {card.series.map((series, index) => (
                <Line
                  key={`s${index}`}
                  name={series.name}
                  dataKey={`s${index}`}
                  stroke={`var(--color-s${index})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          )}
        </ChartContainer>
        {card.series.length > 1 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2">
            {card.series.map((series, index) => (
              <span key={`s${index}`} className="flex items-center gap-1 text-[10px] leading-4 text-text-sub">
                <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index] }} />
                {series.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </ResultCardShell>
  );
}

/** A result the Copilot showed as a card below its answer: a chart, a list of items to open or pick, or a checklist. */
export function CopilotResultCardView({ card }: { card: CopilotResultCard }) {
  switch (card.type) {
    case 'chart':
      return <ChartCard card={card} />;
    case 'list':
      return <ListCard card={card} />;
    case 'checklist':
      return <ChecklistCard card={card} />;
    default: {
      const exhaustive: never = card;
      void exhaustive;

      return null;
    }
  }
}
