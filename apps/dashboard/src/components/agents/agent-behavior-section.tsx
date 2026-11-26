import { AgentReplyPolicyEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiArrowRightSLine, RiCloseCircleLine, RiExpandUpDownLine } from 'react-icons/ri';
import type { RQBJsonLogic } from 'react-querybuilder';
import {
  type AgentBehavior,
  type AgentEmojiEntry,
  type AgentReplyPolicy,
  type AgentResponse,
  type AgentSubscriberAccess,
  getAgentDetailQueryKey,
  getAgentEmojiQueryKey,
  listAgentEmoji,
  updateAgent,
} from '@/api/agents';
import { AgentAccessRuleSheet } from '@/components/agents/agent-access-rule-sheet';
import {
  SUBSCRIBER_ACCESS_MODE_SETTING_LABEL,
  SUBSCRIBER_ACCESS_MODES,
  SUBSCRIBER_ACCESS_SETTING_LABEL,
  SUBSCRIBER_ACCESS_TOOLTIP,
} from '@/components/agents/subscriber-access-copy';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/primitives/button';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { countConditions } from '@/utils/conditions';

const DEFAULT_REACTION_ON_RESOLVED = 'check';
const PROD_READ_ONLY_TOOLTIP =
  'This setting is read-only in production. Edit in Development and promote to apply changes.';
const ACCESS_RULE_READ_ONLY_TOOLTIP =
  'This agent uses an access rule, managed through the API. Changing access here would delete the rule.';

type BehaviorSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  readOnly: boolean;
  readOnlyTooltip?: string;
  onCheckedChange: (checked: boolean) => void;
};

function BehaviorSwitch({
  checked,
  disabled,
  readOnly,
  readOnlyTooltip = PROD_READ_ONLY_TOOLTIP,
  onCheckedChange,
}: BehaviorSwitchProps) {
  if (readOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Switch checked={checked} disabled />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{readOnlyTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />;
}

const REPLY_POLICY_LABELS: Record<AgentReplyPolicy, string> = {
  mention_only: 'Mention only',
  auto_reply: 'Auto-reply in threads',
  smart: 'Smart',
};

const REPLY_POLICY_DESCRIPTIONS: Record<AgentReplyPolicy, string> = {
  mention_only: 'Replies only to messages that @mention the agent.',
  auto_reply: 'Once an @mention pulls the agent into a thread, it keeps replying there without further mentions.',
  smart:
    'Replies without a mention while it is one-on-one, and asks to be @mentioned once someone else or another agent joins, or a teammate is @mentioned.',
};

const REPLY_POLICY_TOOLTIP = (
  <div className="flex flex-col gap-2">
    <p>How the agent decides when to answer in Slack and Teams channels.</p>
    <ul className="flex flex-col gap-1.5">
      {(Object.keys(REPLY_POLICY_LABELS) as AgentReplyPolicy[]).map((policy) => (
        <li key={policy}>
          <span className="font-medium">{REPLY_POLICY_LABELS[policy]}</span>
          <span className="block opacity-80">{REPLY_POLICY_DESCRIPTIONS[policy]}</span>
        </li>
      ))}
    </ul>
    <p className="opacity-80">
      New agents start on Smart. Agents without a saved policy keep Auto-reply. Direct messages always get a reply.
      Channel messages and group chats always need an @mention.
    </p>
  </div>
);

type ReplyPolicySelectProps = {
  value: AgentReplyPolicy;
  disabled?: boolean;
  readOnly: boolean;
  onValueChange: (value: AgentReplyPolicy) => void;
};

function ReplyPolicySelect({ value, disabled, readOnly, onValueChange }: ReplyPolicySelectProps) {
  const select = (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as AgentReplyPolicy)}
      disabled={disabled || readOnly}
    >
      <SelectTrigger size="2xs" className="w-[11.5rem] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={AgentReplyPolicyEnum.MENTION_ONLY}>{REPLY_POLICY_LABELS.mention_only}</SelectItem>
        <SelectItem value={AgentReplyPolicyEnum.AUTO_REPLY}>{REPLY_POLICY_LABELS.auto_reply}</SelectItem>
        <SelectItem value={AgentReplyPolicyEnum.SMART}>{REPLY_POLICY_LABELS.smart}</SelectItem>
      </SelectContent>
    </Select>
  );

  if (readOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{select}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{PROD_READ_ONLY_TOOLTIP}</TooltipContent>
      </Tooltip>
    );
  }

  return select;
}

const SUBSCRIBER_ACCESS_MODE_TOOLTIP = (
  <ul className="flex flex-col gap-1.5">
    {Object.values(SUBSCRIBER_ACCESS_MODES).map(({ label, description }) => (
      <li key={label}>
        <span className="font-medium">{label}</span>
        <span className="block opacity-80">{description}</span>
      </li>
    ))}
  </ul>
);

type SubscriberAccessSettingProps = {
  agent: AgentResponse;
  disabled: boolean;
  readOnly: boolean;
  onAccessChange: (access: Exclude<AgentSubscriberAccess, 'rule'>) => void;
};

function SubscriberAccessSetting({ agent, disabled, readOnly, onAccessChange }: SubscriberAccessSettingProps) {
  const access = agent.behavior.subscriberAccess;
  const [isRuleSheetOpen, setIsRuleSheetOpen] = useState(false);
  const [pendingAccess, setPendingAccess] = useState<Exclude<AgentSubscriberAccess, 'rule'> | null>(null);
  const conditionsCount = countConditions(agent.behavior.accessRule as RQBJsonLogic | undefined);

  const handleValueChange = (next: AgentSubscriberAccess) => {
    if (next === access) return;

    if (next === 'rule') {
      setIsRuleSheetOpen(true);
    } else if (access === 'rule') {
      setPendingAccess(next);
    } else {
      onAccessChange(next);
    }
  };

  const select = (
    <Select value={access} onValueChange={handleValueChange} disabled={disabled || readOnly}>
      <SelectTrigger size="2xs" className="w-[11.5rem] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(SUBSCRIBER_ACCESS_MODES) as AgentSubscriberAccess[]).map((mode) => (
          <SelectItem key={mode} value={mode}>
            {SUBSCRIBER_ACCESS_MODES[mode].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <ToggleRow label={SUBSCRIBER_ACCESS_MODE_SETTING_LABEL} tooltip={SUBSCRIBER_ACCESS_MODE_TOOLTIP}>
        {readOnly ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{select}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{PROD_READ_ONLY_TOOLTIP}</TooltipContent>
          </Tooltip>
        ) : (
          select
        )}
      </ToggleRow>
      <p className="text-text-soft text-paragraph-xs -mt-1">{SUBSCRIBER_ACCESS_MODES[access].description}</p>
      {access === 'rule' && (
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          size="2xs"
          className="self-start"
          trailingIcon={RiArrowRightSLine}
          onClick={() => setIsRuleSheetOpen(true)}
        >
          {readOnly ? 'View rule' : 'Edit rule'}
          <span className="text-text-soft">
            {conditionsCount} condition{conditionsCount === 1 ? '' : 's'}
          </span>
        </Button>
      )}

      <AgentAccessRuleSheet
        agent={agent}
        open={isRuleSheetOpen}
        onOpenChange={setIsRuleSheetOpen}
        readOnly={readOnly}
      />
      <ConfirmationModal
        open={pendingAccess !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAccess(null);
        }}
        onConfirm={() => {
          if (pendingAccess) onAccessChange(pendingAccess);
          setPendingAccess(null);
        }}
        title="Delete the access rule?"
        description={`Switching to ${pendingAccess ? SUBSCRIBER_ACCESS_MODES[pendingAccess].label : ''} deletes this agent's access rule. To use a rule again, you will need to write it again.`}
        confirmButtonText="Switch and delete rule"
        confirmButtonVariant="error"
      />
    </>
  );
}

function useAgentEmoji() {
  const { currentEnvironment } = useEnvironment();

  const { data: emojiList = [] } = useQuery({
    queryKey: getAgentEmojiQueryKey(),
    queryFn: ({ signal }) => listAgentEmoji(requireEnvironment(currentEnvironment, 'No environment selected'), signal),
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

function ToggleRow({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
}) {
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
  const { currentEnvironment, readOnly } = useEnvironment();
  const { emojiList, unicodeMap } = useAgentEmoji();
  const isSubscriberTokensEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SUBSCRIBER_TOKENS_ENABLED);

  const acknowledgeOnReceived = agent.behavior?.acknowledgeOnReceived !== false;
  const reactionOnResolved =
    agent.behavior?.reactionOnResolved === undefined ? DEFAULT_REACTION_ON_RESOLVED : agent.behavior.reactionOnResolved;
  const subscriberAccessOpen = agent.behavior?.subscriberAccess === 'open';
  const hasAccessRule = agent.behavior?.subscriberAccess === 'rule';
  const replyPolicy = agent.behavior?.replyPolicy ?? AgentReplyPolicyEnum.AUTO_REPLY;

  const { mutate, isPending } = useMutation({
    mutationFn: (body: Partial<AgentBehavior>) =>
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
            <BehaviorSwitch
              checked={acknowledgeOnReceived}
              disabled={isPending}
              readOnly={readOnly}
              onCheckedChange={(checked) => mutate({ acknowledgeOnReceived: checked })}
            />
          </ToggleRow>

          <ToggleRow
            label="React to the first message when a conversation is resolved"
            tooltip="Add an emoji reaction to the first message in the thread when the agent resolves the conversation."
          >
            {readOnly ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <ResolvedEmojiPicker
                      currentEmoji={reactionOnResolved}
                      emojiList={emojiList}
                      unicodeMap={unicodeMap}
                      disabled
                      onSelect={() => {}}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{PROD_READ_ONLY_TOOLTIP}</TooltipContent>
              </Tooltip>
            ) : (
              <ResolvedEmojiPicker
                currentEmoji={reactionOnResolved}
                emojiList={emojiList}
                unicodeMap={unicodeMap}
                disabled={isPending}
                onSelect={(emojiName) => mutate({ reactionOnResolved: emojiName })}
              />
            )}
          </ToggleRow>

          <ToggleRow label="Reply policy" tooltip={REPLY_POLICY_TOOLTIP}>
            <ReplyPolicySelect
              value={replyPolicy}
              disabled={isPending}
              readOnly={readOnly}
              onValueChange={(next) => mutate({ replyPolicy: next })}
            />
          </ToggleRow>

          {isSubscriberTokensEnabled ? (
            <SubscriberAccessSetting
              agent={agent}
              disabled={isPending}
              readOnly={readOnly}
              onAccessChange={(subscriberAccess) => mutate({ subscriberAccess })}
            />
          ) : (
            <ToggleRow label={SUBSCRIBER_ACCESS_SETTING_LABEL} tooltip={SUBSCRIBER_ACCESS_TOOLTIP}>
              <BehaviorSwitch
                checked={subscriberAccessOpen}
                disabled={isPending}
                readOnly={readOnly || hasAccessRule}
                readOnlyTooltip={hasAccessRule ? ACCESS_RULE_READ_ONLY_TOOLTIP : undefined}
                onCheckedChange={(checked) => mutate({ subscriberAccess: checked ? 'open' : 'restricted' })}
              />
            </ToggleRow>
          )}
        </div>
      </div>
    </div>
  );
}
