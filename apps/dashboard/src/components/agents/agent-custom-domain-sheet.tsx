import { DomainStatusEnum, FeatureFlagsKeysEnum, type ResourceLimitSource } from '@novu/shared';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiCheckboxCircleFill, RiRefreshLine } from 'react-icons/ri';
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

type DomainLimitError = {
  limit: number;
  limitSource: ResourceLimitSource;
};

/**
 * Maps a create-domain API rejection to the limit dialog (mirrors add-domain-dialog):
 *   - 402 -> plan limit (upgrade lifts it);
 *   - 409 with a `limit` payload -> system cap (contact the Novu team).
 * Other errors fall through to a toast.
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

type SheetPhase = 'input' | 'verify' | 'done';

function resolvePhase(hasDomain: boolean, verified: boolean): SheetPhase {
  if (!hasDomain) {
    return 'input';
  }

  if (verified) {
    return 'done';
  }

  return 'verify';
}

function StatusBadge({ verified }: { verified: boolean }) {
  return (
    <Badge variant="lighter" color={verified ? 'green' : 'orange'} size="md">
      <AnimatedBadgeDot color={verified ? 'green' : 'orange'} size="md" variant="lighter" />
      {verified ? 'Verified' : 'Pending verification'}
    </Badge>
  );
}

type AddDomainFormData = {
  name: string;
};

type AgentCustomDomainSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. on a Domain Connect return), the sheet opens straight into the verify phase for this domain. */
  initialDomainName?: string;
};

/**
 * Inline custom-domain configuration for the agent email inbox card: add a
 * domain, copy its MX record, optionally auto-configure DNS (Domain Connect),
 * and watch it verify — all without leaving the agent Integrations tab. Once
 * verified, the inbox card's address picker lists the domain.
 */
export function AgentCustomDomainSheet({ open, onOpenChange, initialDomainName }: AgentCustomDomainSheetProps) {
  const isDomainConnectEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED, false);
  const createDomain = useCreateDomain();
  const formId = useId();

  const [domainName, setDomainName] = useState(initialDomainName ?? '');
  const [createdDomain, setCreatedDomain] = useState<DomainResponse | undefined>(undefined);
  const [limitError, setLimitError] = useState<DomainLimitError | null>(null);

  const form = useForm<AddDomainFormData>({ defaultValues: { name: '' } });
  const watchedName = form.watch('name');

  // Reopened via a Domain Connect return: jump straight to the named domain's verify phase.
  useEffect(() => {
    if (open && initialDomainName) {
      setDomainName(initialDomainName);
    }
  }, [open, initialDomainName]);

  const { data: fetchedDomain, isLoading: isDomainLoading } = useFetchDomain(domainName || undefined);
  const domain = fetchedDomain ?? createdDomain;
  usePollDomainVerification(domainName || undefined, domain?.status);
  const verifyDomain = useVerifyDomain(domainName || undefined);
  const startAutoConfigure = useStartDomainAutoConfigure(domainName || undefined);

  const isPending = Boolean(domainName) && domain?.status === DomainStatusEnum.PENDING;
  const { data: autoConfigure } = useFetchDomainAutoConfigure(domainName || undefined, {
    enabled: isDomainConnectEnabled && isPending,
  });

  const isVerified = Boolean(domain && domain.status === DomainStatusEnum.VERIFIED && domain.mxRecordConfigured);
  const phase = resolvePhase(Boolean(domainName), isVerified);

  const handleCreate = form.handleSubmit(async ({ name }) => {
    try {
      const created = await createDomain.mutateAsync({ name });
      setCreatedDomain(created);
      setDomainName(created.name);
      form.reset();
    } catch (err: unknown) {
      const domainLimitError = parseDomainLimitError(err);

      if (domainLimitError) {
        setLimitError(domainLimitError);

        return;
      }

      const message = err instanceof Error ? err.message : 'Failed to create domain';
      showErrorToast(message);
    }
  });

  const handleAutoConfigure = async () => {
    if (!domainName) {
      return;
    }

    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('domainConnect');
      currentUrl.searchParams.delete('error');
      currentUrl.searchParams.delete('error_description');
      currentUrl.searchParams.set('customDomain', domainName);
      const response = await startAutoConfigure.mutateAsync(currentUrl.toString());
      window.location.assign(response.applyUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start DNS auto-configuration.';
      showErrorToast(message);
    }
  };

  const resetAndClose = () => {
    setDomainName('');
    setCreatedDomain(undefined);
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-stroke-soft border-b">
            <SheetTitle>Connect a custom domain</SheetTitle>
            <SheetDescription>
              Receive agent email on your own domain. Add the domain, set the MX record, and we&apos;ll verify it —
              without leaving this page.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {phase === 'input' && (
              <Form {...form}>
                <form id={formId} onSubmit={handleCreate} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{
                      required: 'Domain name is required',
                      pattern: { value: DOMAIN_NAME_PATTERN, message: 'Enter a valid domain name (e.g. example.com)' },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="inbound.acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isApexInboundDomain(watchedName) && <ApexDomainMxWarning />}
                </form>
              </Form>
            )}

            {phase === 'verify' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-text-soft text-label-xs font-medium uppercase tracking-wide">Domain</span>
                    <span className="text-text-strong text-label-sm truncate font-medium">{domainName}</span>
                  </div>
                  <StatusBadge verified={false} />
                </div>

                <DomainDnsRecords domain={domain} isLoading={isDomainLoading && !domain} />

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

            {phase === 'done' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <RiCheckboxCircleFill className="text-success-base size-10" aria-hidden />
                <div className="flex flex-col gap-1">
                  <span className="text-text-strong text-label-md font-medium">Domain verified</span>
                  <span className="text-text-soft text-paragraph-sm">
                    <span className="font-medium">{domainName}</span> is ready. Add an address like{' '}
                    <span className="font-code">support@{domainName}</span> from the inbound addresses list.
                  </span>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-stroke-soft border-t">
            {phase === 'input' && (
              <Button type="submit" form={formId} size="sm" isLoading={createDomain.isPending}>
                Add domain
              </Button>
            )}
            {phase === 'verify' && (
              <Button type="button" size="sm" variant="secondary" mode="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
            {phase === 'done' && (
              <Button type="button" size="sm" onClick={resetAndClose}>
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
