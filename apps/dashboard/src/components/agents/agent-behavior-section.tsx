import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiCloseCircleLine, RiExpandUpDownLine } from 'react-icons/ri';
import {
  type AgentEmojiEntry,
  type AgentResponse,
  getAgentDetailQueryKey,
  getAgentEmojiQueryKey,
  listAgentEmoji,
  updateAgent,
} from '@/api/agents';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

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

type ResolvedEmojiPickerProps = {
  currentEmoji: string | null;
  emojiList: AgentEmojiEntry[];
  unicodeMap: Map<string, string>;
  disabled?: boolean;
  onSelect: (emojiName: string | null) => void;
};

function ResolvedEmojiPicker({ currentEmoji, emojiList, unicodeMap, disabled, onSelect }: ResolvedEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const displayUnicode = currentEmoji ? unicodeMap.get(currentEmoji) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="border-stroke-soft bg-bg-white flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-[3px] shadow-xs disabled:opacity-50"
        >
          {currentEmoji === null ? (
            <span className="text-text-soft text-label-sm leading-5">Off</span>
          ) : displayUnicode ? (
            <span className="text-label-sm leading-5">{displayUnicode}</span>
          ) : (
            <span className="text-text-soft text-label-sm leading-5">{currentEmoji}</span>
          )}
          <RiExpandUpDownLine className="text-text-soft size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-0 p-1.5" sideOffset={4}>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className="text-text-sub hover:bg-bg-weak flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          >
            <RiCloseCircleLine className="text-text-soft size-4" />
            <span>Disabled</span>
          </button>
          {emojiList.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => {
                onSelect(entry.name);
                setOpen(false);
              }}
              className={`hover:bg-bg-weak flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                currentEmoji === entry.name ? 'bg-bg-weak' : ''
              }`}
            >
              <span className="text-base leading-5">{entry.unicode}</span>
              <span className="text-text-sub">{entry.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type AgentBehaviorSectionProps = {
  agent: AgentResponse;
};

export function AgentBehaviorSection({ agent }: AgentBehaviorSectionProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const { emojiList, unicodeMap } = useAgentEmoji();

  const acknowledgeOnReceived = agent.behavior?.acknowledgeOnReceived !== false;
  const reactionOnResolved =
    agent.behavior?.reactionOnResolved === undefined ? DEFAULT_REACTION_ON_RESOLVED : agent.behavior.reactionOnResolved;

  const { mutate, isPending } = useMutation({
    mutationFn: (body: { acknowledgeOnReceived?: boolean; reactionOnResolved?: string | null }) =>
      updateAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        behavior: body,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });
    },
    onError: (err: Error) => {
      showErrorToast(err.message, 'Failed to update behavior');
    },
  });

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <SectionHeader>Agent behavior</SectionHeader>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-2 p-3">
          <ToggleRow
            label="Acknowledge incoming messages"
            tooltip='Show a "Typing…" indicator while the agent works. On platforms that don&#39;t support typing, react with an "eyes" emoji instead.'
          >
            <Switch
              checked={acknowledgeOnReceived}
              disabled={isPending}
              onCheckedChange={(checked) => mutate({ acknowledgeOnReceived: checked })}
            />
          </ToggleRow>

          <ToggleRow
            label="React to the first message when a conversation is resolved"
            tooltip="Add an emoji reaction to the first message in the thread when the agent resolves the conversation."
          >
            <ResolvedEmojiPicker
              currentEmoji={reactionOnResolved}
              emojiList={emojiList}
              unicodeMap={unicodeMap}
              disabled={isPending}
              onSelect={(emojiName) => mutate({ reactionOnResolved: emojiName })}
            />
          </ToggleRow>
        </div>
      </div>
    </div>
  );
}
