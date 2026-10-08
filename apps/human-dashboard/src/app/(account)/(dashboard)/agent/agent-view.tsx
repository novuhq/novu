'use client';

import { ChevronRight, Plus, Terminal } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import type { ChannelRow } from '@/components/channels/channels-table';
import { SlackSetup } from '@/components/channels/slack-setup';
import { TelegramSetup } from '@/components/channels/telegram-setup';
import { ConnectToolDrawer, ToolIcon } from '@/components/connect/connect-tool-drawer';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { CopyField } from '@/components/ui/copy-field';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import { AI_TOOLS, type AiTool, type ToolId } from '@/lib/ai-tools';
import type { ChannelVia } from '@/lib/human-channels-api';
import type { SlackSetupState } from '@/lib/human-slack-setup';
import type { TelegramSetupState } from '@/lib/human-telegram-setup';
import { cn } from '@/lib/utils';

import { ShortDate } from '../contacts/short-date';

/** How long one view takes to fade out before the other rises in. */
const SWAP_MS = 200;

const SECTION_LABEL = 'font-mono text-[11px] leading-4 font-medium tracking-[0.06em] text-muted uppercase';

export type AgentSummary = {
  id: string;
  /** Its own name, or "Human assistant" until the operator names it. */
  name: string;
  active: boolean;
  /** ISO timestamp of the `human setup` that made it. */
  createdAt?: string;
};

export type AgentSetupTexts = {
  /** The line to run in a terminal, with the account's key in it. */
  command: string;
  /** The same line as it's shown, with the key cut short. */
  commandDisplay: string;
  /** What to paste into a coding agent so it does the setup. */
  prompt: string;
  /** What to paste once the agent exists, to connect the channels that are still missing. */
  finishPrompt: string;
};

type AgentViewProps = {
  /** `null` until `human setup` has made the agent. */
  agent: AgentSummary | null;
  channels: ChannelRow[];
  telegramSetup: TelegramSetupState;
  slackSetup: SlackSetupState;
  setup: AgentSetupTexts;
  docsUrl: string;
  /** The hosted Human MCP server the tool tiles connect to, or `null` while there is none. */
  mcpUrl: string | null;
  /** The AI tools that have signed in to the account. */
  connectedTools: ToolId[];
};

/**
 * The Agent page in its three states: no agent yet, an agent that only email reaches, and an agent that's
 * ready. The operator does the setup in a terminal and the page is reloaded with what changed
 * (`AgentStatusPoll`), so every state fades or folds into the next one.
 */
export function AgentView({
  agent,
  channels,
  telegramSetup,
  slackSetup,
  setup,
  docsUrl,
  mcpUrl,
  connectedTools,
}: AgentViewProps) {
  // The last agent there was, so its card keeps its words while it fades out.
  const [knownAgent, setKnownAgent] = useState(agent);
  if (agent && agent !== knownAgent) {
    setKnownAgent(agent);
  }

  const { shown, leaving } = useSwap(agent ? 'agent' : 'setup', SWAP_MS);
  const { ref, height } = useMeasuredHeight();

  return (
    <>
      <h1 className="sr-only">Agent</h1>
      {/* The two views differ in height; the block grows or shrinks while one fades into the other. */}
      <div
        style={{ height }}
        className="transition-[height] duration-300 ease-out motion-reduce:transition-none"
        aria-live="polite"
      >
        <div ref={ref}>
          <div
            key={shown}
            className={cn(
              'flex flex-col gap-5',
              leaving
                ? 'opacity-0 transition-opacity ease-in motion-reduce:transition-none'
                : 'animate-rise-in motion-reduce:animate-none'
            )}
            style={leaving ? { transitionDuration: `${SWAP_MS}ms` } : undefined}
          >
            {shown === 'agent' && knownAgent ? (
              <>
                <AgentCard agent={knownAgent} channels={channels} finishPrompt={setup.finishPrompt} />
                <ChannelCards
                  channels={channels}
                  telegramSetup={telegramSetup}
                  slackSetup={slackSetup}
                  agentName={knownAgent.name}
                />
              </>
            ) : (
              <SetupHero setup={setup} docsUrl={docsUrl} />
            )}
          </div>
        </div>
      </div>
      <StartFrom docsUrl={docsUrl} mcpUrl={mcpUrl} connectedTools={connectedTools} />
    </>
  );
}

/** No agent yet: how to make one, by handing a prompt to a coding agent or by running the command. */
function SetupHero({ setup, docsUrl }: { setup: AgentSetupTexts; docsUrl: string }) {
  return (
    <section className="flex overflow-hidden rounded-[10px] border border-border bg-background">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-4.5 p-10">
        <p className={cn(SECTION_LABEL, 'text-accent')}>No agent yet</p>
        <h2 className="text-[30px] leading-9.5 tracking-[-0.75px] text-foreground">
          Let your agent set <em className="font-display text-[32px] text-accent">itself</em> up
        </h2>
        <p className="text-sm leading-5.25 text-secondary">
          Paste this prompt into Claude Code, Codex, Cursor or any agent. It installs Human, gets its own email address
          and asks you before connecting anything else.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={setup.prompt} label="Copy prompt" variant="primary" iconClassName="size-3.5">
            Copy prompt
          </CopyButton>
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center rounded px-3 text-[13px] leading-4.5 font-medium text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
          >
            Read the docs
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <CopyField
          command
          value={setup.command}
          display={setup.commandDisplay}
          label="Copy setup command"
          className="w-full"
        />
      </div>
      <div className="hidden w-100 shrink-0 flex-col items-center gap-[19px] bg-subtle pt-[29px] lg:flex">
        <img src="/illustrations/mascot-waiting.svg" alt="" width={230} height={230} className="size-57.5" />
        <p className="flex gap-2.5 font-mono text-[11px] leading-4 text-muted">
          <span>fig. 01</span>
          <span>waiting to be set up</span>
        </p>
      </div>
    </section>
  );
}

type AgentCardProps = {
  agent: AgentSummary;
  channels: ChannelRow[];
  finishPrompt: string;
};

/**
 * Who the agent is. While no chat app is connected, a banner under it hands over the prompt that finishes
 * the setup; it folds away once Telegram or Slack works.
 */
function AgentCard({ agent, channels, finishPrompt }: AgentCardProps) {
  const emailWorks = channels.some((channel) => channel.via === 'email' && channel.connected);
  const incomplete = !channels.some((channel) => channel.via !== 'email' && channel.connected);

  return (
    <section className="relative overflow-hidden rounded-[10px] border border-border bg-background">
      {/* The glow sits behind the name once the setup is done, and behind the banner until then. */}
      <Dither shown={!incomplete} />
      <div className="relative flex items-center gap-5 px-6 py-5.5">
        <AgentAvatar className="size-14 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.25">
          <h2 className="truncate text-2xl leading-7.5 tracking-tight text-foreground">{agent.name}</h2>
          <p className="flex items-center gap-1.5 text-xs leading-4 text-muted">
            <span className="truncate font-mono text-secondary">{agent.id}</span>
            <CopyButton
              value={agent.id}
              label="Copy agent ID"
              className="size-4 rounded-sm text-muted hover:bg-transparent"
              iconClassName="size-3"
            />
            {agent.createdAt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">
                  Set up <ShortDate iso={agent.createdAt} todayLabel="today" />
                </span>
              </>
            )}
          </p>
        </div>
        <Badge variant={agent.active ? 'success' : 'pending'}>{agent.active ? 'Active' : 'Paused'}</Badge>
      </div>
      <Collapse open={incomplete}>
        <div className="dither-side flex flex-wrap items-center gap-x-3.5 gap-y-3 border-t border-border px-6 py-4.25 [--dither-opacity:0.75]">
          <Terminal aria-hidden="true" className="size-4 shrink-0 text-foreground" />
          <div className="flex min-w-56 flex-1 flex-col">
            <h3 className="text-[13px] leading-4.5 font-medium text-foreground">Finish setup in your agent</h3>
            <p className="text-xs leading-4 text-secondary">
              {emailWorks ? 'Only email works so far.' : 'No channel works yet.'} Paste this prompt and your agent
              connects {emailWorks ? 'Telegram and Slack' : 'them'} with you.
            </p>
          </div>
          <CopyButton value={finishPrompt} label="Copy prompt" variant="primary" iconClassName="size-3.5">
            Copy prompt
          </CopyButton>
        </div>
      </Collapse>
    </section>
  );
}

/** The dithered glow of a card, on a layer of its own so it can fade in and out. */
function Dither({ shown }: { shown: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none',
        !shown && 'opacity-0'
      )}
    >
      <div className="dither-side size-full [--dither-opacity:0.75]" />
    </div>
  );
}

/** Folds its content away, and back, instead of letting it pop. Folded content can't be reached. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** What a channel gives the agent, said to someone who hasn't connected it yet. */
const CHANNEL_PITCH: Record<ChannelVia, string> = {
  email: 'Its own address, so people reply by email.',
  telegram: 'Its own bot, so people reply in Telegram.',
  slack: 'Its own app, so people reply in Slack.',
};

/** Channels whose setup drawer exists. Email is still set up with `human setup email`. */
const HAS_SETUP: Partial<Record<ChannelVia, true>> = { telegram: true, slack: true };

type ChannelCardsProps = {
  channels: ChannelRow[];
  telegramSetup: TelegramSetupState;
  slackSetup: SlackSetupState;
  agentName: string;
};

/** "How people see it": one card per channel, with the agent's address or handle on it once it's connected. */
function ChannelCards({ channels, telegramSetup, slackSetup, agentName }: ChannelCardsProps) {
  const [openSetup, setOpenSetup] = useState<ChannelVia | null>(null);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className={SECTION_LABEL}>How people see it</h2>
        <p className="text-xs leading-4 text-muted">One account, one agent. Each channel is its own identity.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {channels.map((channel) => (
          <li key={channel.via}>
            <ChannelCard channel={channel} onSetUp={() => setOpenSetup(channel.via)} />
          </li>
        ))}
      </ul>
      <TelegramSetup
        setup={telegramSetup}
        open={openSetup === 'telegram'}
        onOpenChange={(open) => setOpenSetup(open ? 'telegram' : null)}
      />
      <SlackSetup
        setup={slackSetup}
        agentName={agentName}
        open={openSetup === 'slack'}
        onOpenChange={(open) => setOpenSetup(open ? 'slack' : null)}
      />
    </section>
  );
}

function ChannelCard({ channel, onSetUp }: { channel: ChannelRow; onSetUp: () => void }) {
  const { connected } = channel;
  const handle = channel.handles.map((entry) => entry.value).join(' · ');

  return (
    <div
      className={cn(
        'h-full rounded-lg border p-4.5 transition-colors duration-300 ease-out motion-reduce:transition-none',
        connected ? 'border-border bg-background' : 'border-dashed border-border-strong'
      )}
    >
      {/* A new key when the channel connects, so the card's new words fade in. */}
      <div key={String(connected)} className="flex animate-overlay-in flex-col motion-reduce:animate-none">
        <div className="flex h-7 items-center justify-between gap-3">
          <ChannelIcon via={channel.via} className={cn('size-7', !connected && 'opacity-40')} />
          {connected ? (
            <Badge variant="success">Connected</Badge>
          ) : HAS_SETUP[channel.via] ? (
            <Button variant="secondary" className={SMALL_BUTTON} onClick={onSetUp}>
              <Plus aria-hidden="true" className="size-3.5" />
              Set up
              <span className="sr-only"> {channel.name}</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              className={SMALL_BUTTON}
              disabled
              title={`Coming soon. For now, run human setup ${channel.via} in your terminal.`}
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Set up
              <span className="sr-only"> {channel.name}</span>
            </Button>
          )}
        </div>
        <h3
          className={cn('mt-3.5 text-[13px] leading-4.5 font-medium', connected ? 'text-foreground' : 'text-secondary')}
        >
          {channel.name}
        </h3>
        {connected ? (
          <p className="mt-1 truncate font-mono text-xs leading-4 text-default">{handle || channel.placeholder}</p>
        ) : (
          <p className="mt-1 truncate text-xs leading-4 text-muted">{CHANNEL_PITCH[channel.via]}</p>
        )}
      </div>
    </div>
  );
}

type StartFromProps = {
  docsUrl: string;
  /** The hosted Human MCP server, or `null` while there is none to connect a tool to. */
  mcpUrl: string | null;
  connectedTools: ToolId[];
};

/**
 * "Or start from": the AI tools Human works in. A tile opens the tool's connect drawer; while there is no
 * MCP server to connect to, it opens the docs instead.
 */
function StartFrom({ docsUrl, mcpUrl, connectedTools }: StartFromProps) {
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  // The tool whose drawer was opened last, so the drawer keeps its words while it slides shut.
  const [drawerTool, setDrawerTool] = useState<AiTool>(AI_TOOLS[0]);

  function open(tool: AiTool) {
    setDrawerTool(tool);
    setOpenTool(tool.id);
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className={SECTION_LABEL}>Or start from</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AI_TOOLS.map((tool) => {
          const connected = connectedTools.includes(tool.id);
          const tile = (
            <ToolTile tool={tool} connected={connected} active={openTool === tool.id} external={mcpUrl === null} />
          );

          return (
            <li key={tool.id}>
              {mcpUrl === null ? (
                <a href={docsUrl} target="_blank" rel="noreferrer" className={TOOL_TILE}>
                  {tile}
                </a>
              ) : (
                <button type="button" onClick={() => open(tool)} className={TOOL_TILE}>
                  {tile}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {mcpUrl !== null && (
        <ConnectToolDrawer
          // Each tool gets a drawer of its own, so what one learned about its connection stays with it.
          key={drawerTool.id}
          tool={drawerTool}
          mcpUrl={mcpUrl}
          connected={connectedTools.includes(drawerTool.id)}
          open={openTool !== null}
          onOpenChange={(isOpen) => setOpenTool(isOpen ? drawerTool.id : null)}
        />
      )}
    </section>
  );
}

const TOOL_TILE = cn(
  buttonClassName('secondary'),
  'group relative h-auto w-full justify-start gap-3 overflow-hidden rounded-lg px-[17px] py-[15px] text-left font-normal'
);

type ToolTileProps = {
  tool: AiTool;
  connected: boolean;
  /** Its drawer is open: the tile glows. */
  active: boolean;
  /** The tile leaves the dashboard for the docs. */
  external: boolean;
};

function ToolTile({ tool, connected, active, external }: ToolTileProps) {
  return (
    <>
      <Dither shown={active} />
      <ToolIcon tool={tool} className="size-8 rounded-[7px]" />
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] leading-4.5 font-medium text-foreground">{tool.name}</span>
        <span className="truncate text-xs leading-4 text-muted">{tool.label}</span>
      </span>
      {/* A new key when the tool connects, so the badge fades in where the arrow was. */}
      <span key={String(connected)} className="relative flex animate-overlay-in motion-reduce:animate-none">
        {connected ? (
          <Badge variant="success">Connected</Badge>
        ) : (
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        )}
      </span>
      {external && <span className="sr-only">(opens the docs in a new tab)</span>}
    </>
  );
}
