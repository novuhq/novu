import { FeatureFlagsKeysEnum } from '@novu/shared';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { RiArrowRightSLine, RiCheckLine, RiCloseLine, RiMailLine, RiMessage3Line, RiMoreLine } from 'react-icons/ri';
import {
  SiGithub,
  SiGooglechat,
  SiLinear,
  SiMessenger,
  SiMicrosoftteams,
  SiTelegram,
  SiWhatsapp,
  SiZoom,
} from 'react-icons/si';
import { NovuApiError, post } from '@/api/api.client';
import { AgentsEmptyTeaser } from '@/components/agents/agents-empty-teaser';
import { AgentsList } from '@/components/agents/agents-list';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Separator } from '@/components/primitives/separator';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { DismissButton, Icon as TagIcon, Root as TagRoot } from '@/components/primitives/tag';
import { Textarea } from '@/components/primitives/textarea';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';

const slackIcon = '/images/providers/light/square/slack.svg';
const discordIcon = '/images/providers/light/square/discord.svg';

const AGENT_RUN_OPTIONS = [
  { value: 'building', label: "We're building one now" },
  { value: 'production', label: 'We have an agent in production' },
  { value: 'exploring', label: 'We are exploring use cases' },
  { value: 'other', label: 'Other' },
] as const;

type AgentRunValue = (typeof AGENT_RUN_OPTIONS)[number]['value'];

type ProviderId =
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'zoom'
  | 'linear'
  | 'github'
  | 'imessages'
  | 'slack'
  | 'ms-teams'
  | 'google-chat'
  | 'discord'
  | 'fb-messenger'
  | 'other';

type ProviderDefinition = {
  id: ProviderId;
  label: string;
  icon: ReactElement;
};

const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: 'whatsapp',
    label: 'Whatsapp',
    icon: <SiWhatsapp className="size-4 shrink-0 text-[#25D366]" aria-hidden />,
  },
  { id: 'telegram', label: 'Telegram', icon: <SiTelegram className="size-4 shrink-0 text-[#229ED9]" aria-hidden /> },
  { id: 'email', label: 'Email', icon: <RiMailLine className="size-4 shrink-0 text-text-sub" aria-hidden /> },
  { id: 'zoom', label: 'Zoom', icon: <SiZoom className="size-4 shrink-0 text-[#0B5CFF]" aria-hidden /> },
  { id: 'linear', label: 'Linear', icon: <SiLinear className="text-text-strong size-4 shrink-0" aria-hidden /> },
  { id: 'github', label: 'GitHub', icon: <SiGithub className="text-text-strong size-4 shrink-0" aria-hidden /> },
  {
    id: 'imessages',
    label: 'iMessages',
    icon: <RiMessage3Line className="size-4 shrink-0 text-[#007AFF]" aria-hidden />,
  },
  { id: 'slack', label: 'Slack', icon: <img src={slackIcon} alt="" className="size-4" /> },
  {
    id: 'ms-teams',
    label: 'MS Teams',
    icon: <SiMicrosoftteams className="size-4 shrink-0 text-[#5059C9]" aria-hidden />,
  },
  {
    id: 'google-chat',
    label: 'Google Chat',
    icon: <SiGooglechat className="size-4 shrink-0 text-[#00AC47]" aria-hidden />,
  },
  {
    id: 'discord',
    label: 'Discord',
    icon: <img src={discordIcon} alt="" className="size-4" />,
  },
  {
    id: 'fb-messenger',
    label: 'FB Messenger',
    icon: <SiMessenger className="size-4 shrink-0 text-[#006AFF]" aria-hidden />,
  },
  { id: 'other', label: 'Other', icon: <RiMoreLine className="size-4 shrink-0 text-text-sub" aria-hidden /> },
];

type AgentsEarlyAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AgentsEarlyAccessFormErrors = {
  providers?: string;
  description?: string;
};

type AgentsEarlyAccessRequestBody = {
  howAgentRunsToday: { value: AgentRunValue; label: string };
  plannedProviders: { id: ProviderId; label: string }[];
  whatAgentDoes: string;
};

function AgentsEarlyAccessDialog({ open, onOpenChange }: AgentsEarlyAccessDialogProps) {
  const formId = useId();
  const agentRunFieldId = `${formId}-agent-run`;
  const providersLabelId = `${formId}-providers`;
  const descriptionFieldId = `${formId}-description`;

  const [agentRun, setAgentRun] = useState<AgentRunValue>('building');
  const [providerIds, setProviderIds] = useState<ProviderId[]>([]);
  const [description, setDescription] = useState('');
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<AgentsEarlyAccessFormErrors>({});

  const providerById = useMemo(() => {
    return new Map(PROVIDER_DEFINITIONS.map((p) => [p.id, p]));
  }, []);

  const earlyAccessMutation = useMutation({
    mutationFn: (payload: AgentsEarlyAccessRequestBody) =>
      post<{ success: boolean }>('/support/agents-early-access', { body: payload }),
  });

  const resetForm = useCallback(() => {
    setAgentRun('building');
    setProviderIds([]);
    setDescription('');
    setProviderMenuOpen(false);
    setFormErrors({});
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm();
    }

    onOpenChange(next);
  };

  const toggleProvider = (id: ProviderId) => {
    setFormErrors((prev) => ({ ...prev, providers: undefined }));
    setProviderIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }

      return [...prev, id];
    });
  };

  const removeProvider = (id: ProviderId) => {
    setProviderIds((prev) => prev.filter((x) => x !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedDescription = description.trim();
    const nextErrors: AgentsEarlyAccessFormErrors = {};

    if (providerIds.length === 0) {
      nextErrors.providers = 'Select at least one provider.';
    }

    if (!trimmedDescription) {
      nextErrors.description = 'Describe what your agent does.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);

      return;
    }

    setFormErrors({});

    const agentRunLabel = AGENT_RUN_OPTIONS.find((o) => o.value === agentRun)?.label ?? agentRun;
    const payload: AgentsEarlyAccessRequestBody = {
      howAgentRunsToday: { value: agentRun, label: agentRunLabel },
      plannedProviders: providerIds.map((id) => ({
        id,
        label: providerById.get(id)?.label ?? id,
      })),
      whatAgentDoes: trimmedDescription,
    };

    try {
      await earlyAccessMutation.mutateAsync(payload);
      showSuccessToast('We received your request and will be in touch.', 'Early access');
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof NovuApiError ? err.message : 'Something went wrong. Please try again.';

      showErrorToast(message, 'Request failed');
    }
  };

  const selectedProvidersOrdered = useMemo(() => {
    return PROVIDER_DEFINITIONS.filter((p) => providerIds.includes(p.id));
  }, [providerIds]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[440px] gap-0 overflow-visible rounded-xl border p-0 shadow-xl"
        hideCloseButton
      >
        <div className="bg-bg-weak flex flex-col gap-3 p-4">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogTitle className="text-text-strong text-[16px] font-medium leading-6 tracking-tight">
                Request early access
              </DialogTitle>
              <DialogDescription className="text-text-soft text-label-xs leading-4">
                Tell us about your use case and we&apos;ll reach out when your account is enabled.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
                <span className="sr-only">Close</span>
              </CompactButton>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="border-stroke-soft bg-background border-y">
            <div className="flex flex-col gap-5 p-4">
              <div className="flex flex-col gap-1">
                <label htmlFor={agentRunFieldId} className="text-text-strong text-label-xs font-medium">
                  How does your agent run today?
                </label>
                <Select value={agentRun} onValueChange={(v) => setAgentRun(v as AgentRunValue)}>
                  <SelectTrigger id={agentRunFieldId} size="2xs" className="shadow-xs h-auto min-h-8 py-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_RUN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-label-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-text-strong text-label-xs font-medium" id={providersLabelId}>
                  What providers do you plan to use?
                </span>
                <Popover open={providerMenuOpen} onOpenChange={setProviderMenuOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'border-stroke-soft bg-bg-white shadow-xs flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-1 py-1 text-left ring-inset',
                        formErrors.providers && 'border-destructive ring-error-base ring-1'
                      )}
                      aria-invalid={formErrors.providers ? true : undefined}
                      aria-labelledby={providersLabelId}
                    >
                      {selectedProvidersOrdered.length === 0 && (
                        <span className="text-text-soft px-1 py-0.5 text-label-xs">Select providers</span>
                      )}
                      {selectedProvidersOrdered.map((p) => (
                        <TagRoot
                          key={p.id}
                          variant="gray"
                          className={cn(
                            'text-text-strong border-stroke-soft h-auto min-h-5 gap-1 rounded border bg-bg-weak-50 px-1 py-0.5',
                            'ring-0 hover:bg-bg-white-0 hover:ring-1 hover:ring-inset hover:ring-stroke-soft'
                          )}
                        >
                          <TagIcon
                            as="span"
                            className="mx-0 flex size-4 shrink-0 items-center justify-center *:size-4 *:max-h-4 *:max-w-4"
                          >
                            {p.icon}
                          </TagIcon>
                          <span className="text-label-xs font-medium leading-4">{p.label}</span>
                          <DismissButton
                            className="mx-0 -mr-px ml-0.5 size-4 shrink-0"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              removeProvider(p.id);
                            }}
                          />
                        </TagRoot>
                      ))}
                      <CaretSortIcon className="text-text-soft ml-auto size-3 shrink-0 opacity-50" aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    portal={false}
                    className="border-stroke-soft z-60 w-(--radix-popover-trigger-width) p-1"
                    align="start"
                    sideOffset={4}
                    collisionPadding={8}
                  >
                    <div className="max-h-56 overflow-y-auto">
                      {PROVIDER_DEFINITIONS.map((p) => {
                        const isSelected = providerIds.includes(p.id);

                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={cn(
                              'hover:bg-bg-weak flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-label-xs',
                              isSelected && 'bg-bg-weak'
                            )}
                            onClick={() => toggleProvider(p.id)}
                          >
                            <span className="flex size-4 shrink-0 items-center justify-center">{p.icon}</span>
                            <span className="text-text-strong flex-1">{p.label}</span>
                            {isSelected ? (
                              <RiCheckLine className="text-primary-base size-4 shrink-0" aria-hidden />
                            ) : (
                              <span className="size-4 shrink-0" aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {formErrors.providers ? (
                  <p className="text-error-base text-label-xs" role="alert">
                    {formErrors.providers}
                  </p>
                ) : null}
              </div>

              <Separator variant="line" />

              <div className="flex flex-col gap-1">
                <label htmlFor={descriptionFieldId} className="text-text-strong text-label-xs font-medium">
                  What does your agent do?
                </label>
                <Textarea
                  id={descriptionFieldId}
                  placeholder="A sentence or two is good."
                  maxLength={200}
                  showCounter
                  hasError={Boolean(formErrors.description)}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setFormErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  className="min-h-[88px]"
                  aria-invalid={formErrors.description ? true : undefined}
                />
                {formErrors.description ? (
                  <p className="text-error-base text-label-xs" role="alert">
                    {formErrors.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end p-3">
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              trailingIcon={RiArrowRightSLine}
              type="submit"
              isLoading={earlyAccessMutation.isPending}
            >
              Request access
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AgentsPage() {
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const isConversationalAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const track = useTelemetry();

  useEffect(() => {
    if (!isConversationalAgentsEnabled) {
      return;
    }

    track(TelemetryEvent.AGENTS_PAGE_VISITED);
  }, [isConversationalAgentsEnabled, track]);

  return (
    <>
      <PageMeta title="Agents" />
      {!isConversationalAgentsEnabled ? (
        <AgentsEarlyAccessDialog open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen} />
      ) : null}
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            Agents{' '}
            <Badge color="gray" size="sm" variant="lighter">
              BETA
            </Badge>
          </h1>
        }
      >
        {isConversationalAgentsEnabled ? (
          <AgentsList />
        ) : (
          <AgentsEmptyTeaser
            cta={
              <Button
                variant="secondary"
                mode="gradient"
                size="xs"
                trailingIcon={RiArrowRightSLine}
                type="button"
                onClick={() => setEarlyAccessOpen(true)}
              >
                Request early access
              </Button>
            }
          />
        )}
      </DashboardLayout>
    </>
  );
}
