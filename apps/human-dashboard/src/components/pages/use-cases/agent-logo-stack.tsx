import Image from 'next/image';

import type { AgentId } from '@/data/channel-pages';
import { cn } from '@/lib/utils';

const logos = [
  { file: 'agent-claude.svg', width: 10.5, height: 10.5, color: 'bg-[#da7757]' },
  { file: 'agent-chatgpt.svg', width: 14, height: 14, color: 'bg-white' },
  { file: 'agent-cursor.svg', width: 9.217, height: 10.5, color: 'bg-white' },
  { file: 'agent-grok.png', width: 14, height: 14, color: 'bg-[#ebebeb]' },
];

export function AgentLogoStack({ round = false, more = false }: { round?: boolean; more?: boolean }) {
  const markScale = round ? 1 : 18 / 14;

  return (
    <span aria-hidden="true" className={cn('isolate flex items-center', round ? '-space-x-1.5' : '-space-x-[5px]')}>
      {logos.slice(0, more ? 3 : logos.length).map(({ file, width, height, color }, index) => (
        <span
          key={file}
          className={cn(
            'relative grid shrink-0 place-items-center overflow-hidden border border-black',
            round ? 'size-5 rounded-full' : 'size-4.5 rounded-sm',
            color
          )}
          style={{ zIndex: logos.length - index }}
        >
          <Image
            src={`/images/use-cases/${file}`}
            width={width * markScale}
            height={height * markScale}
            alt=""
            className="max-w-none"
            unoptimized
          />
        </span>
      ))}
      {more && (
        <span className="grid size-5 place-items-center rounded-full border border-sapien-surface bg-black text-[10px]">
          +
        </span>
      )}
    </span>
  );
}

const badges = {
  'claude-code': 'badge-claude.svg',
  claude: 'badge-claude.svg',
  codex: 'badge-codex.svg',
  opencode: 'badge-opencode.svg',
  cursor: 'badge-cursor.svg',
  hermes: 'badge-hermes.svg',
  openclaw: 'badge-openclaw.svg',
  chatgpt: 'badge-chatgpt.svg',
  'grok-bot': 'agent-grok.png',
} satisfies Record<Exclude<AgentId, 'any-agent'>, string>;

export function UseCaseAgentMark({ id }: { id: keyof typeof badges }) {
  return (
    <Image
      src={`/images/use-cases/${badges[id]}`}
      width={18}
      height={18}
      alt=""
      className="shrink-0 rounded-sm"
      unoptimized
    />
  );
}
