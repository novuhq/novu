import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { type AgentEmojiEntry, getAgentEmojiQueryKey, listAgentEmoji } from '@/api/agents';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { Switch } from '@/components/primitives/switch';
import { useEnvironment } from '@/context/environment/hooks';

const DEFAULT_REACTION_ON_RESOLVED = 'check';

function useAgentEmoji() {
  const { currentEnvironment } = useEnvironment();

  const { data: emojiList = [] } = useQuery({
    queryKey: getAgentEmojiQueryKey(),
    queryFn: ({ signal }) => listAgentEmoji(currentEnvironment!, signal),
    enabled: !!currentEnvironment,
    staleTime: Infinity,
  });

  const unicodeMap = useMemo(
    () => new Map<string, string>(emojiList.map((e: AgentEmojiEntry) => [e.name, e.unicode])),
    [emojiList]
  );

  return { emojiList, unicodeMap };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-2 py-1.5">
      <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
        {children}
      </span>
    </div>
  );
}

function ToggleRow({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex flex-1 items-center gap-1">
        <span className="text-text-sub text-label-sm font-medium">{label}</span>
        <HelpTooltipIndicator text={tooltip} size="5" />
      </div>
      {children}
    </div>
  );
}

function EmojiPickerButton({ emoji }: { emoji: string }) {
  return (
    <button
      type="button"
      className="border-stroke-soft bg-bg-white flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-[3px] shadow-xs"
    >
      <span className="text-label-sm leading-5">{emoji}</span>
      <RiExpandUpDownLine className="text-text-soft size-3" />
    </button>
  );
}

export function AgentBehaviorSection() {
  const { unicodeMap } = useAgentEmoji();
  const resolvedEmoji = unicodeMap.get(DEFAULT_REACTION_ON_RESOLVED) ?? '';

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <SectionHeader>Agent behavior</SectionHeader>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-2 p-3">
          <ToggleRow
            label="Acknowledge incoming messages"
            tooltip='Show a "Typing…" indicator while the agent works. On platforms that don&#39;t support typing, react with an "eyes" emoji instead.'
          >
            <Switch defaultChecked />
          </ToggleRow>

          <ToggleRow
            label="React to the final message when a conversation is resolved"
            tooltip="Add an emoji reaction to the first message in the thread when the conversation is resolved."
          >
            <EmojiPickerButton emoji={resolvedEmoji} />
          </ToggleRow>
        </div>
      </div>
    </div>
  );
}
