import type { ReactNode } from 'react';
import { RiCheckLine } from 'react-icons/ri';
import { SiWhatsapp } from 'react-icons/si';
import { cn } from '@/utils/ui';

const slackIcon = '/images/providers/light/square/slack.svg';
const msTeamsIcon = '/images/providers/light/square/msteams.svg';

const AGENTS_TEASER_BULLETS = [
  'Unified conversation model — one model across every channel',
  'Bidirectional messaging — send and receive through the same layer',
  'Bring your own agent — Claude, AI SDK, LangGraph, or your custom stack',
  'Best practices built in — threading, reactions, formatting, and actions',
] as const;

type AgentsPillProps = {
  children: ReactNode;
  className?: string;
};

function AgentsPill({ children, className }: AgentsPillProps) {
  return (
    <span
      className={cn(
        'border-stroke-soft bg-bg-weak text-text-strong inline-flex items-center gap-1 rounded border px-1 py-0.5 text-label-sm font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}

type AgentsEmptyTeaserProps = {
  cta: ReactNode;
};

export function AgentsEmptyTeaser({ cta }: AgentsEmptyTeaserProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-[800px] flex-col items-stretch gap-12">
        <img
          src="/images/agents-teaser.svg"
          alt=""
          className="block h-auto w-full max-w-[456px]"
          width={456}
          height={256}
        />

        <div className="flex w-full max-w-[700px] flex-col items-start gap-3 self-start">
          <div className="flex flex-col gap-1 text-left">
            <p className="text-text-strong text-[16px] font-medium leading-6 tracking-[-0.176px]">
              Connect your agent. Everywhere your customers are.
            </p>
            <p className="text-text-soft text-[14px] font-medium leading-5 tracking-[-0.084px]">
              A unified API to connect AI SDK/Langchain/Claude managed agents to any channel
            </p>
          </div>

          <ul className="flex flex-col gap-1.5 py-3">
            <li className="text-text-sub flex items-start gap-1.5 text-[14px] font-medium leading-5 tracking-[-0.084px]">
              <RiCheckLine className="text-success mt-0.5 size-3 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <span>Talk to your users across</span>
                <AgentsPill className="-rotate-1">
                  <img src={slackIcon} alt="" className="size-3.5" />
                  <span>Slack</span>
                </AgentsPill>
                <AgentsPill className="rotate-1">
                  <SiWhatsapp className="size-3.5 shrink-0 text-[#25D366]" aria-hidden />
                  <span>WhatsApp</span>
                </AgentsPill>
                <AgentsPill className="-rotate-1">
                  <img src={msTeamsIcon} alt="" className="size-3.5" />
                  <span>MS Teams</span>
                </AgentsPill>
                <span>and a lot more.</span>
              </div>
            </li>

            {AGENTS_TEASER_BULLETS.map((bullet) => (
              <li
                key={bullet}
                className="text-text-sub flex items-start gap-1.5 text-[14px] font-medium leading-5 tracking-[-0.084px]"
              >
                <RiCheckLine className="text-success mt-0.5 size-3 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="flex w-full justify-start">{cta}</div>
        </div>
      </div>
    </div>
  );
}
