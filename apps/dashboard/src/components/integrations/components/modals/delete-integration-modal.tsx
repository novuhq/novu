import { CHANNELS_WITH_PRIMARY, type ChannelTypeEnum, type IIntegration, providers } from '@novu/shared';
import { type ComponentType, type FormEvent, useEffect, useId, useState } from 'react';
import { RiDeleteBin2Line, RiErrorWarningFill, RiRouteFill, RiStarFill } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Input } from '@/components/primitives/input';
import { RadioGroup, RadioGroupItem } from '@/components/primitives/radio-group';
import { useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';
import { ProviderIcon } from '../provider-icon';
import { CHANNEL_LABELS, channelNoun } from '../utils/helpers';
import { CARD_SHADOW } from '../utils/store-styles';

/** The design's compact 28px buttons: 13px label, 6px corners. */
const COMPACT_BUTTON = 'h-7 shrink-0 rounded-md px-2 text-[13px] leading-[1.1]';

/** "email", "push", but "SMS". */
export type DeleteIntegrationModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the integration that takes over as primary, when the deleted one was primary. */
  onConfirm: (newPrimaryIntegrationId?: string) => void;
  integration: IIntegration;
  /** The other integrations on the same channel in the same environment, paused ones included. */
  channelIntegrations?: IIntegration[];
  isLoading?: boolean;
};

/**
 * Deletes an integration from its environment. When it is the channel's primary and more than one active
 * integration could take over, the user picks the new primary first. Every delete ends with typing its name.
 */
export function DeleteIntegrationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  integration,
  channelIntegrations = [],
  isLoading,
}: DeleteIntegrationModalProps) {
  const { environments } = useEnvironment();
  const environmentName = environments?.find((env) => env._id === integration._environmentId)?.name ?? '';
  const channel = integration.channel;
  const activeCandidates = channelIntegrations.filter((other) => other.active);
  const handsOverPrimary =
    !!integration.primary && !!channel && CHANNELS_WITH_PRIMARY.includes(channel) && activeCandidates.length > 0;
  const needsPick = handsOverPrimary && activeCandidates.length > 1;
  const [pickedPrimaryId, setPickedPrimaryId] = useState<string>();
  const pickedPrimary = activeCandidates.find((candidate) => candidate._id === pickedPrimaryId);

  // Each time the dialog opens, start again from the picker.
  useEffect(() => {
    if (isOpen) setPickedPrimaryId(undefined);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="border-stroke-soft w-[440px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl border p-0 shadow-xl"
      >
        {needsPick && !pickedPrimary ? (
          <PickPrimaryStep
            key={String(isOpen)}
            integration={integration}
            channel={channel}
            environmentName={environmentName}
            channelIntegrations={channelIntegrations}
            isLoading={isLoading}
            onCancel={() => onOpenChange(false)}
            onConfirm={setPickedPrimaryId}
          />
        ) : (
          <ConfirmDeleteStep
            key={`${isOpen}-${pickedPrimaryId}`}
            integration={integration}
            channel={channel}
            newPrimary={handsOverPrimary ? (pickedPrimary ?? activeCandidates[0]) : undefined}
            leavesChannelEmpty={activeCandidates.length === 0}
            isLoading={isLoading}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type StepProps = {
  integration: IIntegration;
  channel?: ChannelTypeEnum;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: (newPrimaryIntegrationId?: string) => void;
};

function ConfirmDeleteStep({
  integration,
  channel,
  newPrimary,
  leavesChannelEmpty,
  isLoading,
  onCancel,
  onConfirm,
}: StepProps & { newPrimary?: IIntegration; leavesChannelEmpty: boolean }) {
  const fieldId = useId();
  const [typedName, setTypedName] = useState('');
  const isConfirmed = typedName.trim().toLowerCase() === integration.name.trim().toLowerCase();
  const noun = channel ? channelNoun(channel) : undefined;

  const impacts: { icon: ComponentType<{ className?: string }>; text: string; tone?: 'warning' }[] = [];
  if (newPrimary && noun) {
    impacts.push({ icon: RiStarFill, text: `${newPrimary.name} becomes your primary ${noun} provider` });
  }
  if (leavesChannelEmpty && noun) {
    impacts.push({
      icon: RiErrorWarningFill,
      text: `${CHANNEL_LABELS[channel as ChannelTypeEnum]} steps pause until you add a provider`,
      tone: 'warning',
    });
  }
  if (noun) impacts.push({ icon: RiRouteFill, text: `Workflows keep their ${noun} steps` });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isConfirmed || isLoading) return;
    onConfirm(newPrimary?._id);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3.5 p-5">
        <span className="bg-error-base/10 text-error-base flex size-9 items-center justify-center rounded-[10px]">
          <RiDeleteBin2Line className="size-[18px]" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-label-md text-text-strong">Delete {integration.name}?</DialogTitle>
          <DialogDescription className="text-paragraph-xs text-text-sub">
            It’s removed from this environment only. Other environments keep their own setup. This can’t be undone.
          </DialogDescription>
        </div>

        {impacts.length > 0 && (
          <div className="bg-bg-weak flex flex-col gap-0.5 rounded-[10px] p-1">
            <span className="text-code-xs text-text-sub font-code px-1.5 py-1 uppercase">What happens</span>
            <ul className={cn('bg-bg-white flex flex-col gap-2.5 rounded-md p-3', CARD_SHADOW)}>
              {impacts.map(({ icon: Icon, text, tone }) => (
                <li key={text} className="text-paragraph-sm text-text-sub flex items-center gap-2">
                  <Icon className={cn('size-4 shrink-0', tone === 'warning' ? 'text-warning-base' : 'text-text-sub')} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-label-xs text-text-sub">
            Type <span className="text-text-strong">{integration.name}</span> to confirm
          </label>
          <Input
            id={fieldId}
            size="xs"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={integration.name}
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
          />
        </div>
      </div>

      <DialogFooter onCancel={onCancel}>
        <Button
          type="submit"
          variant="error"
          mode="gradient"
          size="2xs"
          className={COMPACT_BUTTON}
          disabled={!isConfirmed}
          isLoading={isLoading}
        >
          Delete provider
        </Button>
      </DialogFooter>
    </form>
  );
}

function PickPrimaryStep({
  integration,
  channel,
  environmentName,
  channelIntegrations,
  isLoading,
  onCancel,
  onConfirm,
}: StepProps & { environmentName: string; channelIntegrations: IIntegration[] }) {
  const firstActive = channelIntegrations.find((other) => other.active);
  const [selectedId, setSelectedId] = useState(firstActive?._id ?? '');
  const selected = channelIntegrations.find((other) => other._id === selectedId);
  const noun = channel ? channelNoun(channel) : 'channel';
  const channelLabel = channel ? CHANNEL_LABELS[channel] : 'this channel';
  // Active integrations first, so paused ones sit at the bottom of the list.
  const options = [...channelIntegrations].sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected?.active && !isLoading) onConfirm(selected._id);
      }}
    >
      <div className="flex flex-col gap-3.5 p-5">
        <span className="bg-bg-weak text-primary-base flex size-9 items-center justify-center rounded-[10px]">
          <RiStarFill className="size-[18px]" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-label-md text-text-strong">Pick a new primary {noun} provider</DialogTitle>
          <DialogDescription className="text-paragraph-xs text-text-sub">
            {integration.name} is your primary for {channelLabel}
            {environmentName ? ` in ${environmentName}` : ''}. Choose which provider sends {noun} once it’s deleted.
          </DialogDescription>
        </div>

        <div className="bg-bg-weak flex flex-col gap-0.5 rounded-[10px] p-1">
          <span className="text-code-xs text-text-sub font-code px-1.5 py-1 uppercase">
            {channelLabel} providers{environmentName ? ` in ${environmentName}` : ''}
          </span>
          <RadioGroup
            value={selectedId}
            onValueChange={setSelectedId}
            className={cn(
              // About four rows, so the footer buttons stay on screen however many providers the channel has.
              'bg-bg-white scrollbar-custom max-h-[min(232px,40vh)] gap-0 overflow-y-auto rounded-md',
              CARD_SHADOW
            )}
            aria-label={`New primary ${noun} provider`}
          >
            {options.map((option) => (
              <PrimaryOption
                key={option._id}
                integration={option}
                environmentName={environmentName}
                isSelected={option._id === selectedId}
              />
            ))}
          </RadioGroup>
        </div>
      </div>

      <DialogFooter onCancel={onCancel}>
        <Button
          type="submit"
          variant="error"
          mode="gradient"
          size="2xs"
          className={cn(COMPACT_BUTTON, 'max-w-[280px]')}
          disabled={!selected?.active}
          isLoading={isLoading}
        >
          <span className="truncate">Make {selected?.name ?? 'it'} primary and delete</span>
        </Button>
      </DialogFooter>
    </form>
  );
}

function PrimaryOption({
  integration,
  environmentName,
  isSelected,
}: {
  integration: IIntegration;
  environmentName: string;
  isSelected: boolean;
}) {
  const id = useId();
  const provider = providers.find((item) => item.id === integration.providerId);
  const isPaused = !integration.active;

  return (
    <label
      htmlFor={id}
      className={cn(
        'border-stroke-soft flex items-center gap-2.5 border-b py-2.5 pl-2.5 pr-3 last:border-b-0',
        isPaused ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-bg-weak',
        isSelected && 'bg-bg-weak'
      )}
    >
      <RadioGroupItem
        id={id}
        value={integration._id}
        disabled={isPaused}
        className={cn(
          'border-stroke-sub bg-bg-white size-4 shrink-0 border-[1.5px] shadow-none',
          // Selected: 1.5px primary ring around an 8px primary dot, drawn with an inset white ring instead of the icon.
          'data-[state=checked]:border-primary-base data-[state=checked]:bg-primary-base data-[state=checked]:shadow-[inset_0_0_0_2.5px_white] [&_svg]:hidden'
        )}
      />
      <span className="border-stroke-soft flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-[#f4f4f5]">
        <ProviderIcon
          providerId={integration.providerId}
          providerDisplayName={provider?.displayName ?? integration.name}
          className="size-4"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label-sm text-text-strong truncate">{integration.name}</span>
        <span className="text-code-xs text-text-soft font-code truncate">{integration.identifier}</span>
      </span>
      {isPaused && (
        <span className="text-paragraph-xs text-text-soft shrink-0">
          Paused{environmentName ? ` in ${environmentName}` : ''}
        </span>
      )}
    </label>
  );
}

function DialogFooter({ onCancel, children }: { onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="border-stroke-soft bg-bg-weak flex items-center justify-end gap-2 border-t px-5 py-3">
      <Button
        type="button"
        variant="secondary"
        mode="ghost"
        size="2xs"
        className={cn(COMPACT_BUTTON, 'text-text-strong')}
        onClick={onCancel}
      >
        Cancel
      </Button>
      {children}
    </div>
  );
}
