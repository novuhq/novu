import Image from 'next/image';
import Link from 'next/link';

import { LandingHeading, LandingMark } from '@/components/pages/channels/shared';
import { CopyButton } from '@/components/sapien/copy-button';
import { CopyCommand } from '@/components/sapien/copy-command';
import { DisplayAccent } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sapien/tabs';
import { CHANNELS } from '@/data/channel-pages';
import { SETUP_COMMAND } from '@/data/sapien';
import { USE_CASE_GROUPS } from '@/data/use-cases';
import { MCP_URL } from '@/lib/hosts';

import { AgentLogoStack } from './agent-logo-stack';
import { ExampleScene } from './listing';

const setupPrompt = 'Set up Agent Inbox from https://www.agentinbox.md/agents.md';
const steps = [
  {
    id: 'connect',
    label: 'Connect your agent',
    description:
      'Run one command in your terminal, or add the MCP server to Claude, ChatGPT, Cursor and other AI tools.',
    panel: <ConnectPanel />,
  },
  {
    id: 'channels',
    label: 'Add your channels',
    description:
      'Email works right away. Connect a Telegram bot or a Slack app in a few minutes, and invite your team.',
    panel: <ChannelsPanel />,
  },
  {
    id: 'messages',
    label: 'Ask and hear back',
    description: 'Your agent asks, approves, offers choices or sends updates, and people can message it first.',
    panel: <MessagesPanel />,
  },
];

export function UseCaseSetup() {
  return (
    <>
      <SectionFrame anchor="set-it-up" className="isolate px-4 py-20 text-center md:px-8 md:py-30">
        <Image
          src="/images/use-cases/setup-rays.png"
          alt=""
          fill
          className="pointer-events-none -z-10 object-bottom"
          sizes="(min-width: 992px) 960px, 100vw"
          unoptimized
        />
        <h2 className="text-[30px] leading-[1.125] tracking-[-0.04em] md:text-4xl">
          Set it up from your agent
          <br />
          or <DisplayAccent className="text-[1.33em] leading-tight">let your agent</DisplayAccent> set it up
        </h2>
        <p className="mt-5 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/60">
          Paste this into Claude Code, Codex, Cursor or any agent that can read the web.
        </p>
        <div className="mx-auto mt-8 max-w-[568px]">
          <div className="overflow-hidden rounded-[10px] border border-sapien-surface bg-[#100f0d] text-left">
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 bg-[#12110f] p-2">
              <p className="w-fit rounded-md border border-sapien-surface px-2.5 py-1 text-xs font-medium">
                Tell your agent
              </p>
              <CopyButton
                text={setupPrompt}
                variant="icon-and-text"
                className="flex min-h-8 items-center gap-1.5 rounded-sm bg-accent px-2.5 text-[13px] font-medium text-black hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Copy
              </CopyButton>
            </div>
            <div className="space-y-3 p-4 font-sapien-mono">
              <code className="block text-[13px] leading-5 [overflow-wrap:anywhere]">{setupPrompt}</code>
              <p className="text-[11px] leading-[14px] text-sapien-foreground/60">
                Paste it into your agent. It reads the steps, sets up the inbox and asks you to approve its login on
                agentinbox.md.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-sapien-foreground/60">
            <McpMark />
            <p>
              Prefer MCP? Add <McpLink /> to
            </p>
            <AgentLogoStack round />
          </div>
        </div>
      </SectionFrame>
      <SectionFrame anchor="setup" className="px-4 py-20 md:px-8 md:py-30">
        <LandingHeading lead="Three steps, whatever" accent="you’re building" />
        <Tabs defaultValue="connect" orientation="vertical" className="mt-12 gap-8 md:flex-row md:gap-12 lg:mt-20">
          <TabsList aria-label="Setup steps" className="min-w-0 flex-1 flex-col">
            {steps.map(({ id, label, description }, index) => (
              <TabsTrigger
                key={id}
                value={id}
                className="group grid grid-cols-[auto_1fr] gap-x-4 border-l-2 border-sapien-border py-4 pr-2 pl-6 text-left text-sapien-foreground/60 data-[state=active]:border-accent data-[state=active]:text-sapien-foreground focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="self-center font-sapien-mono text-[13px] tracking-tight group-data-[state=active]:text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-xl leading-[1.2] tracking-[-0.04em] sm:text-2xl">{label}</span>
                <span className="col-start-2 mt-2.5 hidden text-[15px] leading-[21px] tracking-tight text-sapien-foreground/60 group-data-[state=active]:block">
                  {description}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="min-w-0 flex-1 self-start rounded-[20px] border border-sapien-surface bg-[#191715] bg-[url(/images/use-cases/stepper-dots.svg)] bg-top p-3 sm:p-6">
            {steps.map(({ id, panel }) => (
              <TabsContent key={id} value={id}>
                {panel}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </SectionFrame>
    </>
  );
}

function McpLink() {
  return (
    <a
      href={MCP_URL}
      className="font-sapien-mono text-accent underline underline-offset-2 [overflow-wrap:anywhere] hover:text-sapien-foreground"
    >
      {MCP_URL}
    </a>
  );
}

function McpMark() {
  return <Image src="/images/use-cases/mcp.svg" width={14} height={14} alt="" unoptimized />;
}

function ConnectPanel() {
  return (
    <div>
      <div className="overflow-hidden rounded-[10px] border border-sapien-surface bg-black">
        <div aria-hidden="true" className="flex gap-1.5 border-b border-sapien-surface px-3.5 py-3">
          <span className="size-1.5 rounded-full bg-sapien-raised" />
          <span className="size-1.5 rounded-full bg-sapien-raised" />
          <span className="size-1.5 rounded-full bg-sapien-raised" />
        </div>
        <CopyCommand command={SETUP_COMMAND} label="Connect your agent command" variant="icon" className="p-3" />
      </div>
      <p className="my-2 text-center font-sapien-mono text-[11px] text-sapien-foreground/60">or</p>
      <div className="rounded-[10px] border border-sapien-surface bg-black p-3">
        <a
          href={MCP_URL}
          className="flex min-h-10 items-center gap-2.5 rounded-lg border border-accent/40 px-2.5 py-2 font-sapien-mono text-[15px] leading-5 hover:border-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <McpMark />
          <span className="min-w-0 [overflow-wrap:anywhere]">{MCP_URL}</span>
          <Image
            src="/images/use-cases/mcp-arrow.svg"
            width={18}
            height={18}
            className="ml-auto shrink-0"
            alt=""
            unoptimized
          />
        </a>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 font-sapien-mono text-[10px] text-sapien-foreground/60">
          <AgentLogoStack round more />
          <span>Claude, ChatGPT, Cursor and other AI tools</span>
        </div>
      </div>
    </div>
  );
}

function ChannelsPanel() {
  return (
    <div className="space-y-2">
      {(['email', 'telegram', 'slack'] as const).map((channel) => (
        <Link
          key={channel}
          href={`/${channel}`}
          className="flex min-h-11 items-center gap-2.5 rounded-lg border border-sapien-surface bg-black px-3 text-sm hover:border-accent/40 hover:text-accent"
        >
          <LandingMark name={channel} size={16} />
          {CHANNELS[channel].name}
          {channel === 'email' && (
            <span className="ml-auto text-accent">
              <Image src="/images/use-cases/hero-check.svg" width={18} height={18} alt="" unoptimized />
              <span className="sr-only">Ready to use</span>
            </span>
          )}
        </Link>
      ))}
      <Link
        href="/contacts"
        className="flex min-h-11 items-center gap-2.5 rounded-lg border border-sapien-surface bg-black px-3 text-sm hover:border-accent/40 hover:text-accent"
      >
        <Image src="/images/use-cases/invite.svg" width={18} height={18} alt="" unoptimized />
        Invite your team
      </Link>
    </div>
  );
}

function MessagesPanel() {
  const [approvals] = USE_CASE_GROUPS[0].cases;

  return (
    <div className="rounded-[10px] border border-sapien-surface bg-black p-2">
      <ul className="flex flex-wrap gap-1.5 px-2 pt-1 pb-3 font-sapien-mono text-[11px]">
        {['ask', 'approve', 'choose', 'tell'].map((kind) => (
          <li
            key={kind}
            className={
              kind === 'approve'
                ? 'rounded-md bg-sapien-foreground px-2.5 py-1 text-black'
                : 'rounded-md border border-sapien-surface px-2.5 py-1 text-sapien-foreground/70'
            }
          >
            {kind}
          </li>
        ))}
      </ul>
      <ExampleScene example={approvals} walkthrough />
    </div>
  );
}
