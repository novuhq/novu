import {
  ChannelTypeEnum,
  DomainStatusEnum,
  emailProviders as emailProviderConfigs,
  EmailProviderIdEnum,
  type IIntegration,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiAddLine, RiExpandUpDownLine, RiKey2Line, RiLoader4Line, RiMailSendLine, RiSearchLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { type AgentResponse, sendAgentTestEmail } from '@/api/agents';
import { type DomainResponse } from '@/api/domains';
import { createIntegration } from '@/api/integrations';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { CATCH_ALL_ADDRESS, useEmailSetupCredentials } from './use-email-setup-credentials';

export type EmailSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

type OutboundDropdownItem = {
  providerId: string;
  displayName: string;
  integration?: IIntegration;
  isDemo: boolean;
};

function DemoBadge() {
  return (
    <span className="bg-warning-lighter text-warning-dark rounded px-1 py-px text-[9px] font-semibold uppercase leading-3">
      Demo
    </span>
  );
}

const OUTBOUND_EMAIL_PROVIDERS = emailProviderConfigs.filter(
  (p) => p.id !== EmailProviderIdEnum.NovuAgent
);

function buildOutboundItems(allIntegrations: IIntegration[] | undefined): OutboundDropdownItem[] {
  const integrationsByProvider = new Map<string, IIntegration[]>();
  for (const i of allIntegrations ?? []) {
    if (i.channel !== ChannelTypeEnum.EMAIL) continue;
    if (i.providerId === EmailProviderIdEnum.NovuAgent) continue;
    const list = integrationsByProvider.get(i.providerId) ?? [];
    list.push(i);
    integrationsByProvider.set(i.providerId, list);
  }

  const items: OutboundDropdownItem[] = [];
  for (const cfg of OUTBOUND_EMAIL_PROVIDERS) {
    const existing = integrationsByProvider.get(cfg.id);
    const isDemo = cfg.id === EmailProviderIdEnum.Novu;
    if (existing?.length) {
      for (const integration of existing) {
        items.push({
          providerId: cfg.id,
          displayName: integration.name || cfg.displayName,
          integration,
          isDemo,
        });
      }
    }
    if (!isDemo) {
      items.push({ providerId: cfg.id, displayName: cfg.displayName, isDemo: false });
    }
  }

  return items;
}

function getItemKey(item: OutboundDropdownItem, index: number): string {
  return item.integration ? `${item.providerId}-${item.integration._id}` : `${item.providerId}-new-${index}`;
}

function OutboundProviderSelect({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (integrationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const { integrations } = useFetchIntegrations();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const items = useMemo(() => buildOutboundItems(integrations), [integrations]);

  const selected = useMemo(
    () => (selectedId ? items.find((i) => i.integration?._id === selectedId) : undefined),
    [items, selectedId]
  );

  const isBusy = pendingKey !== null;

  const createMutation = useMutation({
    mutationFn: async (vars: { providerId: string; name: string }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const response = await createIntegration(
        {
          providerId: vars.providerId,
          channel: ChannelTypeEnum.EMAIL,
          credentials: {},
          configurations: {},
          name: vars.name,
          active: true,
          _environmentId: environment._id,
        },
        environment
      );

      return response.data;
    },
  });

  async function handleSelect(item: OutboundDropdownItem, index: number) {
    if (isBusy) return;
    if (!currentEnvironment?._id) {
      showErrorToast('No environment selected.', 'Cannot select provider');

      return;
    }

    const key = getItemKey(item, index);
    setPendingKey(key);

    try {
      if (item.integration) {
        onSelect(item.integration._id);
      } else {
        const count = (integrations ?? []).filter((i) => i.providerId === item.providerId).length;
        const created = await createMutation.mutateAsync({
          providerId: item.providerId,
          name: `${item.displayName} ${count + 1}`,
        });
        await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment._id] });
        onSelect(created._id);
      }
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not select provider.';
      showErrorToast(message, 'Selection failed');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-px">
        <span className="text-text-sub text-label-xs font-medium leading-4">Send emails via</span>
        <span className="text-text-soft ml-0.5 text-[10px]">&#9432;</span>
      </div>

      <div className="w-full max-w-[320px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isBusy}
              className="border-stroke-soft bg-bg-white flex h-7 w-full max-w-[320px] items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs disabled:opacity-60"
            >
              {selected ? (
                <div className="flex items-center gap-1">
                  <ProviderIcon
                    providerId={selected.providerId}
                    providerDisplayName={selected.displayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-strong text-label-xs font-medium leading-4">{selected.displayName}</span>
                  {selected.isDemo && <DemoBadge />}
                </div>
              ) : (
                <span className="text-text-soft text-label-xs font-medium leading-4">Select provider...</span>
              )}
              {isBusy ? (
                <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
              ) : (
                <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-(--radix-popover-trigger-width) max-w-[320px] min-w-[220px] overflow-hidden p-0"
            align="start"
          >
            <Command>
              <div className="bg-bg-weak border-stroke-weak flex items-center gap-2 border-b py-1.5 pl-3 pr-3">
                <CommandInput
                  placeholder="Search provider"
                  size="xs"
                  disabled={isBusy}
                  inputRootClassName="min-w-0 flex-1 rounded-none border-none bg-transparent shadow-none divide-none before:ring-0 has-[input:focus]:shadow-none has-[input:focus]:ring-0 focus-within:shadow-none focus-within:ring-0"
                  inputWrapperClassName="h-4 min-h-4 bg-transparent px-0 py-0 hover:[&:not(&:has(input:focus))]:bg-transparent has-[input:disabled]:bg-transparent"
                  className="text-text-sub text-label-xs leading-4 placeholder:text-text-sub h-4 min-h-4 py-0"
                />
                <RiSearchLine className="text-text-soft size-3 shrink-0" />
              </div>
              <CommandList className="max-h-[260px] p-1">
                <CommandEmpty className="text-text-soft text-label-xs py-4">No email providers found.</CommandEmpty>
                <CommandGroup
                  heading="Email providers"
                  className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
                >
                  {items.map((item, index) => {
                    const key = getItemKey(item, index);
                    const isRowPending = pendingKey === key;

                    return (
                      <CommandItem
                        key={key}
                        value={`${item.displayName} ${item.providerId}${item.integration ? ` ${item.integration.identifier}` : ''}`}
                        disabled={isBusy}
                        onSelect={() => {
                          void handleSelect(item, index);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-md p-1',
                          item.integration?._id === selectedId && 'bg-bg-muted'
                        )}
                      >
                        <div className="flex flex-1 items-center gap-1">
                          <ProviderIcon
                            providerId={item.providerId}
                            providerDisplayName={item.displayName}
                            className="size-4 shrink-0"
                          />
                          <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">
                            {item.displayName}
                          </span>
                          {item.isDemo && <DemoBadge />}
                        </div>
                        {isRowPending && (
                          <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
                        )}
                        {!isRowPending && item.integration && (
                          <span className="font-code text-text-sub shrink-0 text-[10px] leading-[15px] tracking-[-0.2px]">
                            {item.integration.identifier}
                          </span>
                        )}
                        {!isRowPending && !item.integration && (
                          <RiAddLine className="text-text-soft size-3 shrink-0" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selected?.isDemo && (
        <p className="text-warning-dark text-label-xs max-w-[320px] font-medium leading-4">
          This is a demo provider for development and testing. Switch to a production provider (e.g. Resend, SendGrid)
          before going live.
        </p>
      )}
    </div>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InboundAddressConfig({
  localPart,
  domainName,
  domains,
  replyFrom,
  onLocalPartChange,
  onLocalPartBlur,
  onDomainChange,
  onReplyFromChange,
  onReplyFromBlur,
}: {
  localPart: string;
  domainName: string;
  domains: DomainResponse[];
  replyFrom: string;
  onLocalPartChange: (v: string) => void;
  onLocalPartBlur: () => void;
  onDomainChange: (v: string) => void;
  onReplyFromChange: (v: string) => void;
  onReplyFromBlur: () => void;
}) {
  const [domainOpen, setDomainOpen] = useState(false);
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  const verifiedDomains = domains.filter(
    (d) => d.status === DomainStatusEnum.VERIFIED && d.mxRecordConfigured
  );

  const isCatchAll = localPart === CATCH_ALL_ADDRESS;
  const [replyFromError, setReplyFromError] = useState(false);

  function handleReplyFromBlur() {
    if (!replyFrom) return;
    const valid = EMAIL_PATTERN.test(replyFrom);
    setReplyFromError(!valid);
    if (valid) onReplyFromBlur();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <div className="border-stroke-soft bg-bg-white flex h-8 items-center overflow-hidden rounded-lg border shadow-xs">
          <input
            type="text"
            aria-label="Inbound email local part"
            className="text-text-sub text-label-xs h-full w-[120px] bg-transparent px-2 font-medium outline-none"
            placeholder="agent"
            value={localPart}
            onChange={(e) => onLocalPartChange(e.target.value)}
            onBlur={onLocalPartBlur}
          />
        </div>
        <span className="text-text-soft text-label-xs font-medium">@</span>
        <Popover open={domainOpen} onOpenChange={setDomainOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Select inbound domain"
              className="border-stroke-soft bg-bg-white flex h-8 min-w-[180px] items-center justify-between overflow-hidden rounded-lg border px-2 shadow-xs"
            >
              {domainName ? (
                <span className="text-text-sub text-label-xs font-medium leading-4">{domainName}</span>
              ) : (
                <span className="text-text-soft text-label-xs font-medium leading-4">Select domain...</span>
              )}
              <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="min-w-[180px] overflow-hidden p-0" align="start">
            <Command>
              <div className="bg-bg-weak border-stroke-weak flex items-center gap-2 border-b py-1.5 pl-3 pr-3">
                <CommandInput
                  placeholder="Search domain"
                  size="xs"
                  inputRootClassName="min-w-0 flex-1 rounded-none border-none bg-transparent shadow-none divide-none before:ring-0 has-[input:focus]:shadow-none has-[input:focus]:ring-0 focus-within:shadow-none focus-within:ring-0"
                  inputWrapperClassName="h-4 min-h-4 bg-transparent px-0 py-0 hover:[&:not(&:has(input:focus))]:bg-transparent has-[input:disabled]:bg-transparent"
                  className="text-text-sub text-label-xs leading-4 placeholder:text-text-sub h-4 min-h-4 py-0"
                />
                <RiSearchLine className="text-text-soft size-3 shrink-0" />
              </div>
              <CommandList className="max-h-[200px] p-1">
                <CommandEmpty className="text-text-soft text-label-xs py-4">No domains found.</CommandEmpty>
                <CommandGroup
                  heading="Domains"
                  className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
                >
                  {verifiedDomains.map((d) => (
                    <CommandItem
                      key={d._id}
                      value={d.name}
                      onSelect={() => {
                        onDomainChange(d.name);
                        setDomainOpen(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-md p-1',
                        d.name === domainName && 'bg-bg-muted'
                      )}
                    >
                      <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">{d.name}</span>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="__add_domain__"
                    onSelect={() => {
                      setDomainOpen(false);
                      navigate(domainsPath);
                    }}
                    className="flex items-center gap-2 rounded-md p-1"
                  >
                    <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">Add domain</span>
                    <RiAddLine className="text-text-soft size-3 shrink-0" />
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {isCatchAll && (
        <>
          <p className="text-text-soft text-label-xs font-medium leading-4">
            Catch-all: every email sent to this domain routes to this agent.
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-text-sub text-label-xs font-medium leading-4">Reply-from address</span>
            <div
              className={cn(
                'border-stroke-soft bg-bg-white flex h-8 items-center overflow-hidden rounded-lg border shadow-xs',
                replyFromError && 'border-destructive'
              )}
            >
              <input
                type="email"
                aria-label="Reply-from email address"
                className="text-text-sub text-label-xs h-full w-full bg-transparent px-2 font-medium outline-none"
                placeholder={domainName ? `agent@${domainName}` : 'agent@yourdomain.com'}
                value={replyFrom}
                onChange={(e) => {
                  setReplyFromError(false);
                  onReplyFromChange(e.target.value);
                }}
                onBlur={handleReplyFromBlur}
              />
            </div>
            {replyFromError ? (
              <p className="text-destructive text-label-xs font-medium leading-4">Enter a valid email address.</p>
            ) : (
              <p className="text-text-soft text-label-xs font-medium leading-4">
                The From address shown to recipients in outbound replies.
              </p>
            )}
          </div>
        </>
      )}

      <p className="text-text-soft text-label-xs font-medium leading-4">
        <Link to={domainsPath} className="text-text-sub underline">
          Configure custom domains
        </Link>
        {' by adding them to Novu.'}
      </p>
    </div>
  );
}

export function EmailSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: EmailSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();

  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isCredentialsSaved, setIsCredentialsSaved] = useState(false);

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return sendAgentTestEmail(environment, agent.identifier);
    },
    onSuccess: () => {
      showSuccessToast('Test email sent to the configured inbound address.');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not send test email.';
      showErrorToast(message, 'Test email failed');
    },
  });

  const emailIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent),
    [integrations, integrationId]
  );

  const {
    outboundId,
    localPart,
    domainName,
    replyFrom,
    domains,
    needsCredentialsStep,
    outboundProviderConfig,
    setLocalPart,
    setReplyFrom,
    onOutboundSelect,
    onLocalPartBlur,
    onDomainChange,
    onReplyFromBlur,
  } = useEmailSetupCredentials({ emailIntegration, integrations, agent });

  function handleOutboundSelect(id: string) {
    setIsCredentialsSaved(false);
    onOutboundSelect(id);
  }

  const base = stepOffset;

  const credentialsStepIndex = base + 1;
  const inboundStepIndex = needsCredentialsStep ? base + 2 : base + 1;
  const testStepIndex = inboundStepIndex + 1;

  const firstIncompleteStep = useMemo(() => {
    if (!outboundId) return base;
    if (needsCredentialsStep && !isCredentialsSaved) return base + 1;
    if (!localPart || !domainName) return inboundStepIndex;
    if (localPart === CATCH_ALL_ADDRESS && !replyFrom) return inboundStepIndex;

    return testStepIndex;
  }, [base, outboundId, needsCredentialsStep, isCredentialsSaved, localPart, domainName, replyFrom, inboundStepIndex, testStepIndex]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        sectionLabel="SETUP SENDING EMAILS"
        title="Setup providers to send emails"
        description={
          <span>
            {'Choose which email provider sends outbound replies from your agent. '}
            <Link to={ROUTES.INTEGRATIONS} className="text-text-sub underline underline-offset-2">
              Manage email providers
            </Link>
          </span>
        }
        rightContent={
          <OutboundProviderSelect
            selectedId={outboundId || undefined}
            onSelect={handleOutboundSelect}
          />
        }
      />

      {needsCredentialsStep && (
        <SetupStep
          index={credentialsStepIndex}
          status={deriveStepStatus(credentialsStepIndex, firstIncompleteStep)}
          title={`Configure ${outboundProviderConfig?.displayName ?? 'provider'} credentials`}
          description={
            <span>
              {'Paste API keys or credentials from your email provider into the integration. '}
              {outboundProviderConfig?.docReference && (
                <a
                  href={outboundProviderConfig.docReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-sub underline"
                >
                  View setup guide
                </a>
              )}
            </span>
          }
          rightContent={
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              Configure credentials
            </SetupButton>
          }
        />
      )}

      <SetupStep
        index={inboundStepIndex}
        status={deriveStepStatus(inboundStepIndex, firstIncompleteStep)}
        sectionLabel="SETUP RECEIVING EMAILS"
        title="Configure inbound address"
        description="Inbound emails are received through Novu. Subscribers will send emails to this address to talk to your agent, and replies to workflow notifications also route here."
        rightContent={
          <InboundAddressConfig
            localPart={localPart}
            domainName={domainName}
            domains={domains}
            replyFrom={replyFrom}
            onLocalPartChange={setLocalPart}
            onLocalPartBlur={onLocalPartBlur}
            onDomainChange={onDomainChange}
            onReplyFromChange={setReplyFrom}
            onReplyFromBlur={onReplyFromBlur}
          />
        }
      />

      <SetupStep
        index={testStepIndex}
        status={deriveStepStatus(testStepIndex, firstIncompleteStep)}
        title="Test connection"
        description="Send an email to the inbound address and verify it reaches your agent handler."
        rightContent={
          <SetupButton
            leadingIcon={
              testEmailMutation.isPending ? (
                <RiLoader4Line className="size-3.5 animate-spin" />
              ) : (
                <RiMailSendLine className="size-3.5" />
              )
            }
            disabled={firstIncompleteStep < testStepIndex || testEmailMutation.isPending}
            onClick={() => testEmailMutation.mutate()}
          >
            {testEmailMutation.isPending ? 'Sending...' : 'Send test email'}
          </SetupButton>
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={onStepsCompleted}
      connectedMessage="Your email integration is connected. This agent is ready to receive emails."
      listeningMessage="Send an email to the configured inbound address to verify configuration."
    />
  );

  const credentialsSidebar = outboundId && needsCredentialsStep ? (
    <IntegrationCredentialsSidebar
      integrationId={outboundId}
      isOpen={isCredentialsSidebarOpen}
      onClose={() => setIsCredentialsSidebarOpen(false)}
      onSaveSuccess={() => setIsCredentialsSaved(true)}
    />
  ) : null;

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6')}>
          <div
            className="absolute bottom-0 left-[22px] top-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
            }}
          />
          {stepsColumn}
        </div>
        {listening}
        {credentialsSidebar}
      </div>
    );
  }

  return (
    <>
      {stepsColumn}
      {listening}
      {credentialsSidebar}
    </>
  );
}
