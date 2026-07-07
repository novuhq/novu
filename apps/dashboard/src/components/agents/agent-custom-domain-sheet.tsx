import { DomainStatusEnum, FeatureFlagsKeysEnum, type ResourceLimitSource } from '@novu/shared';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiAddLine, RiArrowLeftSLine, RiArrowRightSLine, RiCheckboxCircleFill, RiRefreshLine } from 'react-icons/ri';
import { NovuApiError } from '@/api/api.client';
import type { DomainResponse } from '@/api/domains';
import { ApexDomainMxWarning } from '@/components/domains/apex-domain-mx-warning';
import { DomainDnsRecords } from '@/components/domains/domain-dns-records';
import { DomainLimitDialog } from '@/components/domains/domain-limit-dialog';
import { AnimatedBadgeDot, Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { LoadingIndicator } from '@/components/primitives/loading-indicator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/primitives/sheet';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import {
  useFetchDomain,
  useFetchDomainAutoConfigure,
  usePollDomainVerification,
  useStartDomainAutoConfigure,
  useVerifyDomain,
} from '@/hooks/use-domain';
import { useCreateDomain } from '@/hooks/use-domains';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { DOMAIN_NAME_PATTERN, isApexInboundDomain } from '@/utils/inbound-domain';
import { cn } from '@/utils/ui';
import type { ConfiguredAddress } from './use-email-setup-credentials';

/** Valid local-part for an address route: a lowercase dot-atom subset (the wildcard `*` is handled separately). */
const LOCAL_PART_REGEX = /^[a-z0-9._-]+$/;

type DomainLimitError = {
  limit: number;
  limitSource: ResourceLimitSource;
};

/**
 * Maps a create-domain API rejection to the limit dialog (mirrors add-domain-dialog):
 *   - 402 -> plan limit (upgrade lifts it);
 *   - 409 with a `limit` payload -> system cap (contact the Novu team).
 * Other errors fall through to the caller.
 */
function parseDomainLimitError(err: unknown): DomainLimitError | null {
  if (!(err instanceof NovuApiError)) {
    return null;
  }

  const rawLimit = (err.rawError as { limit?: number } | undefined)?.limit;

  if (typeof rawLimit !== 'number') {
    return null;
  }

  if (err.status === 402) {
    return { limit: rawLimit, limitSource: 'plan' };
  }

  if (err.status === 409) {
    return { limit: rawLimit, limitSource: 'system' };
  }

  return null;
}

/**
 * A 409 without a `limit` payload is the global-uniqueness conflict: a domain
 * with this name exists, but not in this environment's list (so it's owned
 * elsewhere and cannot be claimed here).
 */
function isAlreadyExistsConflict(err: unknown): boolean {
  return err instanceof NovuApiError && err.status === 409 && parseDomainLimitError(err) === null;
}

function isDomainVerified(domain: DomainResponse | undefined): boolean {
  return Boolean(domain && domain.status === DomainStatusEnum.VERIFIED && domain.mxRecordConfigured);
}

function formatAddress(address: string, domainName: string): string {
  return address === '*' ? `*@${domainName}` : `${address}@${domainName}`;
}

function StatusBadge({ verified }: { verified: boolean }) {
  return (
    <Badge variant="lighter" color={verified ? 'green' : 'orange'} size="md">
      <AnimatedBadgeDot color={verified ? 'green' : 'orange'} size="md" variant="lighter" />
      {verified ? 'Verified' : 'Pending verification'}
    </Badge>
  );
}

type SheetView = 'list' | 'add' | 'domain';

type AddDomainFormData = {
  name: string;
};

type AgentCustomDomainSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. on a Domain Connect return), the sheet opens straight to this domain's view. */
  initialDomainName?: string;
  /** Every domain in the current environment (verified + pending), from `useEmailSetupCredentials`. */
  domains: DomainResponse[];
  /** The current agent's configured addresses — shown inline per domain and used to de-dupe. */
  configuredAddresses: ConfiguredAddress[];
  /** Creates a `DomainRouteTypeEnum.AGENT` route for the current agent on the given domain. */
  onAddAddress: (address: string, domain: DomainResponse) => void;
};

/**
 * Unified custom-domain manager for the agent email inbox card. A single
 * server-driven surface that lists the environment's domains (verified and
 * pending), lets the user add a new one, resumes a pending domain's MX
 * verification inline, and — once verified — adds an inbound address that
 * routes to this agent. The environment domain list is the source of truth, so
 * navigating away and back never loses an in-progress domain, and re-adding an
 * existing one resumes it instead of erroring.
 */
export function AgentCustomDomainSheet({
  open,
  onOpenChange,
  initialDomainName,
  domains,
  configuredAddresses,
  onAddAddress,
}: AgentCustomDomainSheetProps) {
  const isDomainConnectEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED, false);
  const createDomain = useCreateDomain();
  const formId = useId();

  const [view, setView] = useState<SheetView>('list');
  const [selectedDomainName, setSelectedDomainName] = useState<string | undefined>(undefined);
  const [limitError, setLimitError] = useState<DomainLimitError | null>(null);

  const form = useForm<AddDomainFormData>({ defaultValues: { name: '' } });
  const watchedName = form.watch('name');

  // Initialize on open / reset on close. Server-driven: nothing about the
  // in-progress domain is persisted client-side; the list (and a deep-link)
  // are enough to resume.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;

      if (!initialDomainName) {
        setSelectedDomainName(undefined);
        setView('list');
      }
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
      setSelectedDomainName(undefined);
      setView('list');
      setLimitError(null);
      form.reset();
    }
  }, [open, initialDomainName, form]);

  // Deep-link (e.g. Domain Connect return): jump straight to the named domain's view.
  useEffect(() => {
    if (open && initialDomainName) {
      setSelectedDomainName(initialDomainName);
      setView('domain');
    }
  }, [open, initialDomainName]);

  const { data: fetchedDomain, isLoading: isDomainLoading } = useFetchDomain(selectedDomainName);
  const listDomain = useMemo(
    () => domains.find((domain) => domain.name === selectedDomainName),
    [domains, selectedDomainName]
  );
  const selectedDomain = fetchedDomain ?? listDomain;
  usePollDomainVerification(selectedDomainName, selectedDomain?.status);
  const verifyDomain = useVerifyDomain(selectedDomainName);
  const startAutoConfigure = useStartDomainAutoConfigure(selectedDomainName);

  const isSelectedPending = Boolean(selectedDomainName) && selectedDomain?.status === DomainStatusEnum.PENDING;
  const { data: autoConfigure } = useFetchDomainAutoConfigure(selectedDomainName, {
    enabled: isDomainConnectEnabled && isSelectedPending,
  });

  // Once a viewed pending domain verifies (via polling), this flips true and the
  // domain view automatically advances from the MX step to the address step.
  const isSelectedVerified = isDomainVerified(selectedDomain);

  const selectedDomainAddresses = useMemo(
    () => (selectedDomain ? configuredAddresses.filter((address) => address.domainId === selectedDomain._id) : []),
    [configuredAddresses, selectedDomain]
  );

  function openDomain(name: string) {
    setSelectedDomainName(name);
    setView('domain');
  }

  function goToList() {
    setSelectedDomainName(undefined);
    setView('list');
  }

  function goToAdd() {
    form.reset();
    setView('add');
  }

  const handleCreate = form.handleSubmit(async ({ name }) => {
    const normalized = name.trim().toLowerCase();

    // Already in this environment's list -> resume it instead of creating (the
    // exact lost-state / "already exists" fix).
    const existing = domains.find((domain) => domain.name === normalized);

    if (existing) {
      openDomain(existing.name);
      form.reset();

      return;
    }

    try {
      const created = await createDomain.mutateAsync({ name });
      openDomain(created.name);
      form.reset();
    } catch (err: unknown) {
      const domainLimitError = parseDomainLimitError(err);

      if (domainLimitError) {
        setLimitError(domainLimitError);

        return;
      }

      if (isAlreadyExistsConflict(err)) {
        form.setError('name', {
          type: 'manual',
          message: "This domain is already in use and can't be added here.",
        });

        return;
      }

      const message = err instanceof Error ? err.message : 'Failed to create domain';
      showErrorToast(message);
    }
  });

  const handleAutoConfigure = async () => {
    if (!selectedDomainName) {
      return;
    }

    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('domainConnect');
      currentUrl.searchParams.delete('error');
      currentUrl.searchParams.delete('error_description');
      currentUrl.searchParams.set('customDomain', selectedDomainName);
      const response = await startAutoConfigure.mutateAsync(currentUrl.toString());
      window.location.assign(response.applyUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start DNS auto-configuration.';
      showErrorToast(message);
    }
  };

  function handleAddAddress(address: string) {
    if (!selectedDomain) {
      return;
    }

    onAddAddress(address, selectedDomain);
    goToList();
  }

  const description = (() => {
    if (view === 'add') {
      return "Add the domain, set the MX record, and we'll verify it: all without leaving this page.";
    }

    if (view === 'domain') {
      return isSelectedVerified
        ? 'Add an inbound address that routes mail to this agent.'
        : 'Set the MX record at your DNS provider: we check automatically.';
    }

    return 'Connect your own domain so this agent can receive email on it.';
  })();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-stroke-soft border-b">
            <SheetTitle>Custom domains</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {view === 'list' && (
              <DomainListView
                domains={domains}
                configuredAddresses={configuredAddresses}
                onSelectDomain={openDomain}
                onAddDomain={goToAdd}
              />
            )}

            {view === 'add' && (
              <div className="flex flex-col gap-4">
                <BackButton onClick={goToList} />
                <Form {...form}>
                  <form id={formId} onSubmit={handleCreate} className="flex flex-col gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{
                        required: 'Domain name is required',
                        pattern: {
                          value: DOMAIN_NAME_PATTERN,
                          message: 'Enter a valid domain name (e.g. example.com)',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="inbound.acme.com"
                              {...field}
                              onChange={(event) => {
                                field.onChange(event);

                                if (form.formState.errors.name) {
                                  form.clearErrors('name');
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isApexInboundDomain(watchedName) && <ApexDomainMxWarning />}
                  </form>
                </Form>
              </div>
            )}

            {view === 'domain' && !selectedDomain && (
              <div className="flex flex-col gap-5">
                <BackButton onClick={goToList} />
                <div className="flex items-center justify-center py-10">
                  <LoadingIndicator size="md" />
                </div>
              </div>
            )}

            {view === 'domain' && selectedDomain && (
              <div className="flex flex-col gap-5">
                <BackButton onClick={goToList} />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-text-soft text-label-xs font-medium uppercase tracking-wide">Domain</span>
                    <span className="text-text-strong text-label-sm truncate font-medium">{selectedDomain.name}</span>
                  </div>
                  <StatusBadge verified={isSelectedVerified} />
                </div>

                {isSelectedVerified ? (
                  <div className="flex flex-col gap-5">
                    <div className="text-success-base flex items-center gap-2 text-paragraph-sm">
                      <RiCheckboxCircleFill className="size-5 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">{selectedDomain.name}</span> is verified and ready to receive
                        mail.
                      </span>
                    </div>
                    <DomainAddressStep
                      domain={selectedDomain}
                      existingAddresses={selectedDomainAddresses}
                      onAdd={handleAddAddress}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    <DomainDnsRecords
                      domain={fetchedDomain ?? selectedDomain}
                      isLoading={isDomainLoading && !fetchedDomain}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        mode="outline"
                        size="xs"
                        leadingIcon={RiRefreshLine}
                        isLoading={verifyDomain.isPending}
                        onClick={() => verifyDomain.mutate()}
                      >
                        Refresh status
                      </Button>
                      {isDomainConnectEnabled && autoConfigure?.available ? (
                        <Button
                          type="button"
                          variant="secondary"
                          mode="outline"
                          size="xs"
                          isLoading={startAutoConfigure.isPending}
                          onClick={handleAutoConfigure}
                        >
                          Auto configure DNS
                        </Button>
                      ) : null}
                    </div>

                    <div className="text-text-soft flex items-center gap-2 text-paragraph-xs leading-4">
                      <LoadingIndicator size="sm" />
                      <span>Checking automatically. Once the MX record is detected, your domain is ready to use.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="border-stroke-soft border-t">
            {view === 'list' && (
              <Button type="button" size="sm" leadingIcon={RiAddLine} onClick={goToAdd}>
                Add new domain
              </Button>
            )}
            {view === 'add' && (
              <Button type="submit" form={formId} size="sm" isLoading={createDomain.isPending}>
                Add domain
              </Button>
            )}
            {view === 'domain' && (
              <Button type="button" size="sm" variant="secondary" mode="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {limitError ? (
        <DomainLimitDialog
          open
          onOpenChange={(dialogOpen) => {
            if (!dialogOpen) {
              setLimitError(null);
            }
          }}
          limit={limitError.limit}
          limitSource={limitError.limitSource}
        />
      ) : null}
    </>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text-soft hover:text-text-sub -ml-1 inline-flex items-center gap-0.5 self-start text-label-xs font-medium transition-colors"
    >
      <RiArrowLeftSLine className="size-4" aria-hidden />
      All domains
    </button>
  );
}

type DomainListViewProps = {
  domains: DomainResponse[];
  configuredAddresses: ConfiguredAddress[];
  onSelectDomain: (name: string) => void;
  onAddDomain: () => void;
};

function DomainListView({ domains, configuredAddresses, onSelectDomain, onAddDomain }: DomainListViewProps) {
  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="text-text-strong text-label-sm font-medium">No custom domains yet</span>
        <span className="text-text-soft text-paragraph-xs max-w-[320px]">
          Add a domain to receive email on your own address and route it to this agent.
        </span>
        <Button type="button" size="sm" leadingIcon={RiAddLine} onClick={onAddDomain} className="mt-1">
          Add new domain
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {domains.map((domain) => {
        const addresses = configuredAddresses.filter((address) => address.domainId === domain._id);
        const verified = isDomainVerified(domain);

        return (
          <button
            key={domain._id}
            type="button"
            onClick={() => onSelectDomain(domain.name)}
            className="border-stroke-soft bg-bg-white hover:border-stroke-strong flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left shadow-xs transition-colors"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-text-strong text-label-sm truncate font-medium">{domain.name}</span>
              {addresses.length > 0 ? (
                <span className="text-text-soft truncate font-code text-code-xs">
                  {addresses.map((address) => formatAddress(address.address, domain.name)).join(', ')}
                </span>
              ) : (
                <span className="text-text-soft text-label-xs">
                  {verified ? 'No addresses yet' : 'Finish DNS setup to use'}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge verified={verified} />
              <RiArrowRightSLine className="text-text-soft size-4" aria-hidden />
            </div>
          </button>
        );
      })}
    </div>
  );
}

type AddressMode = 'address' | 'wildcard';

type DomainAddressStepProps = {
  domain: DomainResponse;
  existingAddresses: ConfiguredAddress[];
  onAdd: (address: string) => void;
};

function DomainAddressStep({ domain, existingAddresses, onAdd }: DomainAddressStepProps) {
  const [mode, setMode] = useState<AddressMode>('address');
  const [localPart, setLocalPart] = useState('');

  const trimmed = localPart.trim().toLowerCase();
  const resolvedAddress = mode === 'wildcard' ? '*' : trimmed;
  const isValidAddress = mode === 'wildcard' || (trimmed.length > 0 && LOCAL_PART_REGEX.test(trimmed));
  const isDuplicate = existingAddresses.some((address) => address.address === resolvedAddress);
  const canAdd = isValidAddress && !isDuplicate;

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }

    onAdd(resolvedAddress);
    setLocalPart('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <AddressModeCard
          title="Address"
          description={
            <>
              Match one inbox, like <span className="font-code">support@{domain.name}</span>.
            </>
          }
          selected={mode === 'address'}
          onSelect={() => setMode('address')}
        />
        <AddressModeCard
          title="Wildcard"
          description={
            <>
              Match every address with <span className="font-code">*@{domain.name}</span>.
            </>
          }
          selected={mode === 'wildcard'}
          onSelect={() => setMode('wildcard')}
        />
      </div>

      {mode === 'address' ? (
        <div className="border-stroke-soft bg-bg-white flex h-9 items-center overflow-hidden rounded-lg border shadow-xs">
          <input
            type="text"
            aria-label="Inbound email local part"
            className="text-text-sub text-label-sm h-full min-w-0 flex-1 bg-transparent px-3 font-medium outline-none"
            placeholder="support"
            value={localPart}
            onChange={(event) => setLocalPart(event.target.value.replace(/\s/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAdd();
              }
            }}
          />
          <span className="text-text-soft shrink-0 px-3 text-label-sm">@{domain.name}</span>
        </div>
      ) : (
        <div className="border-stroke-soft bg-bg-weak text-text-sub flex h-9 items-center rounded-lg border px-3 font-code text-code-xs">
          *@{domain.name}
        </div>
      )}

      {isDuplicate ? (
        <p className="text-warning-base text-label-xs">This address is already connected to this agent.</p>
      ) : null}

      <Button
        type="button"
        size="sm"
        leadingIcon={RiAddLine}
        disabled={!canAdd}
        onClick={handleAdd}
        className="self-start"
      >
        Add address
      </Button>

      {existingAddresses.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-text-soft text-label-xs font-medium uppercase tracking-wide">Connected addresses</span>
          <div className="flex flex-wrap gap-1.5">
            {existingAddresses.map((address) => (
              <span
                key={`${address.address}-${address.domainId}`}
                className="text-text-sub bg-bg-weak rounded-md px-2 py-1 font-code text-code-xs"
              >
                {formatAddress(address.address, domain.name)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type AddressModeCardProps = {
  title: string;
  description: ReactNode;
  selected: boolean;
  onSelect: () => void;
};

function AddressModeCard({ title, description, selected, onSelect }: AddressModeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-stroke-strong bg-bg-weak' : 'border-stroke-soft hover:border-stroke-strong'
      )}
    >
      <span className="text-text-strong text-label-sm font-medium">{title}</span>
      <span className="text-text-soft text-label-xs leading-4">{description}</span>
    </button>
  );
}
