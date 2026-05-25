import type { ReactNode } from 'react';
import { RiCheckLine, RiGithubFill } from 'react-icons/ri';
import { SiLinear, SiNotion, SiWhatsapp } from 'react-icons/si';
import { cn } from '@/utils/ui';

const slackIcon = '/images/providers/light/square/slack.svg';
const msTeamsIcon = '/images/providers/light/square/msteams.svg';

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
              Connect your agent. Everywhere your team works.
            </p>
            <p className="text-text-soft text-[14px] font-medium leading-5 tracking-[-0.084px]">
              Give it a voice in every channel your team uses.
            </p>
          </div>

          <ul className="flex flex-col gap-1.5 py-3">
            <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
              <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
              <span>Talk to your agent across</span>
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
            </li>

            <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
              <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
              <span>Authorize tools mid-conversation. No setup gauntlets.</span>
            </li>

            <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
              <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
              <span>Connect tools and MCPs</span>
              <AgentsPill className="-rotate-1">
                <RiGithubFill className="size-3.5 shrink-0" aria-hidden />
                <span>GitHub</span>
              </AgentsPill>
              <AgentsPill className="rotate-1">
                <SiLinear className="size-3.5 shrink-0 text-[#5C6BF1]" aria-hidden />
                <span>Linear</span>
              </AgentsPill>
              <AgentsPill className="-rotate-1">
                <SiNotion className="text-text-strong size-3.5 shrink-0" aria-hidden />
                <span>Notion</span>
              </AgentsPill>
              <span>and custom tools your team works on.</span>
            </li>
          </ul>

          <div className="flex w-full justify-start">{cta}</div>
        </div>
      </div>
    </div>
  );
}
