import { CaretSortIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent, ReactElement, ReactNode } from 'react';
import { useCallback, useId, useMemo, useState } from 'react';
import {
  RiArrowRightSLine,
  RiChat3Line,
  RiCheckLine,
  RiCloseLine,
  RiGithubFill,
  RiMailLine,
  RiMessage3Line,
  RiMoreLine,
  RiUser3Line,
} from 'react-icons/ri';
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
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Separator } from '@/components/primitives/separator';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { DismissButton, Icon as TagIcon, Root as TagRoot } from '@/components/primitives/tag';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';

const slackIcon = '/images/providers/light/square/slack.svg';
const msTeamsIcon = '/images/providers/light/square/msteams.svg';
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

  return (
    <>
      <PageMeta title="Agents" />
      <AgentsEarlyAccessDialog open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen} />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Agents</h1>}>
        <div className="flex min-h-[min(720px,calc(100vh-8rem))] flex-col items-center justify-center px-4 py-10 md:px-8">
          <div className="flex w-full max-w-[1133px] flex-col items-stretch gap-12">
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
                  Unified conversational API for AI agents
                </p>
                <p className="text-text-soft text-[14px] font-medium leading-5 tracking-[-0.084px]">
                  You own the agent Brain, and Novu gives it voice. Distribute your agent across multiple channels with
                  a unified API.
                </p>
              </div>

              <ul className="flex flex-col gap-1.5 py-3">
                <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
                  <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
                  <span>Connect your agent to</span>
                  <AgentsPill className="-rotate-1">
                    <img src={slackIcon} alt="" className="size-3.5" />
                    <span>Slack</span>
                  </AgentsPill>
                  <AgentsPill className="rotate-1">
                    <RiGithubFill className="size-3.5 shrink-0" aria-hidden />
                    <span>GitHub</span>
                  </AgentsPill>
                  <AgentsPill className="-rotate-1">
                    <img src={msTeamsIcon} alt="" className="size-3.5" />
                    <span>MS Teams</span>
                  </AgentsPill>
                  <AgentsPill className="rotate-1">
                    <SiWhatsapp className="size-3.5 shrink-0 text-[#25D366]" aria-hidden />
                    <span>WhatsApp</span>
                  </AgentsPill>
                  <AgentsPill className="-rotate-1">
                    <SiLinear className="text-text-strong size-3.5 shrink-0" aria-hidden />
                    <span>Linear</span>
                  </AgentsPill>
                  <span>and +15 more.</span>
                </li>

                <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
                  <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
                  <span>Access conversation history</span>
                  <AgentsPill>
                    <RiChat3Line className="text-text-sub size-3" aria-hidden />
                    <span className="font-mono text-[14px] tracking-[-0.28px]">5</span>
                  </AgentsPill>
                  <span>
                    and state via unified <code className="text-text-strong font-mono text-[14px]">agent()</code>{' '}
                    handler.
                  </span>
                </li>

                <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
                  <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
                  <span>Provider identities resolved to</span>
                  <AgentsPill>
                    <span className="bg-neutral-alpha-200 flex size-4 items-center justify-center rounded-full">
                      <RiUser3Line className="text-text-sub size-3" aria-hidden />
                    </span>
                    <span className="text-text-strong">Subscriber</span>
                  </AgentsPill>
                  <span>entity.</span>
                </li>

                <li className="text-text-sub flex flex-wrap items-center gap-1 text-[14px] font-medium leading-5 tracking-[-0.084px]">
                  <RiCheckLine className="text-success size-3 shrink-0" aria-hidden />
                  <span>Rich provider interactions, like action buttons, attachments, reactions, and more.</span>
                </li>
              </ul>

              <div className="flex w-full justify-start">
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
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
