import { DomainStatusEnum, FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { formatDistanceToNow } from 'date-fns';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';
import type { IconType } from 'react-icons';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiEarthLine,
  RiInformationLine,
  RiMore2Fill,
  RiRefreshLine,
} from 'react-icons/ri';
import { SiCloudflare, SiVercel } from 'react-icons/si';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  DetailsSidebar,
  DetailsSidebarCard,
  DetailsSidebarRow,
  ExpandableDetailsTextarea,
} from '@/components/details-sidebar';
import { DomainRouting, type DomainRoutingHandle } from '@/components/domains/domain-routing';
import { PageMeta } from '@/components/page-meta';
import { AnimatedBadgeDot, Badge } from '@/components/primitives/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { CollapsibleSection } from '@/components/primitives/collapsible-section';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { InlineToast } from '@/components/primitives/inline-toast';
import { LoadingIndicator } from '@/components/primitives/loading-indicator';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { useEnvironment } from '@/context/environment/hooks';
import {
  useFetchDomain,
  useFetchDomainAutoConfigure,
  usePollDomainVerification,
  useRefreshDomain,
  useStartDomainAutoConfigure,
  useUpdateDomain,
  useVerifyDomain,
} from '@/hooks/use-domain';
import { useDeleteDomain } from '@/hooks/use-domains';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useHasPermission } from '@/hooks/use-has-permission';
import { parseDomainMetadataJson } from '@/utils/domain-metadata';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

const DOMAIN_CONNECT_VERIFYING_TIMEOUT_MS = 90_000;
const VERIFIED_CONFETTI_DURATION_MS = 8_000;

function formatLongDate(dateStr: string): string {
  const formatted = new Date(dateStr).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);

  return formatted;
}

function formatMetadataDraft(data?: Record<string, string>): string {
  return JSON.stringify(data ?? {}, null, 2);
}

function normalizeMetadata(data?: Record<string, string>): string {
  const sortedData = Object.fromEntries(
    Object.entries(data ?? {}).sort(([left], [right]) => left.localeCompare(right))
  );

  return JSON.stringify(sortedData);
}

function DomainStatusBadge({ status }: { status: DomainStatusEnum }) {
  const isVerified = status === DomainStatusEnum.VERIFIED;

  return (
    <Badge variant="lighter" color={isVerified ? 'green' : 'orange'} size="md">
      <AnimatedBadgeDot color={isVerified ? 'green' : 'orange'} size="md" variant="lighter" />
      {isVerified ? 'Verified' : 'Pending verification'}
    </Badge>
  );
}

function MxRecordStatusBadge({ configured }: { configured: boolean }) {
  return (
    <Badge variant="lighter" color={configured ? 'green' : 'orange'} size="md">
      <AnimatedBadgeDot color={configured ? 'green' : 'orange'} size="md" variant="lighter" />
      {configured ? 'Verified' : 'Pending'}
    </Badge>
  );
}

export function DomainDetailPage() {
  const { domain: domainParam } = useParams<{ domain: string }>();
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: domain, isLoading, isFetching } = useFetchDomain(domainParam);
  usePollDomainVerification(domainParam, domain?.status);
  const isDomainConnectInboundEmailEnabled = useFeatureFlag(
    FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED,
    false
  );
  const { data: domainConnectStatus, isLoading: isDomainConnectStatusLoading } = useFetchDomainAutoConfigure(
    domainParam,
    {
      enabled: isDomainConnectInboundEmailEnabled && domain?.status === DomainStatusEnum.PENDING,
    }
  );
  const { refresh: refreshDomain } = useRefreshDomain(domainParam);
  const verifyDomain = useVerifyDomain(domainParam);
  const updateDomainMeta = useUpdateDomain(domainParam);
  const startDomainAutoConfigure = useStartDomainAutoConfigure(domainParam);
  const deleteDomain = useDeleteDomain();
  const routingRef = useRef<DomainRoutingHandle>(null);
  const hasHandledDomainConnectReturnRef = useRef(false);
  const hasShownConnectedToastRef = useRef(false);
  const previousDomainStatusRef = useRef<DomainStatusEnum | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [hasSubmittedDomainConnectReturn, setHasSubmittedDomainConnectReturn] = useState(false);
  const [hasDomainConnectFailure, setHasDomainConnectFailure] = useState(false);
  const [domainConnectApplyUrl, setDomainConnectApplyUrl] = useState<string | undefined>();
  const [metadataDraft, setMetadataDraft] = useState('{}');
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [isRoutingOpen, setIsRoutingOpen] = useState(true);
  const [showVerifiedConfetti, setShowVerifiedConfetti] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));
  const domainConnectReturnStatus = searchParams.get('domainConnect');
  const domainConnectError = searchParams.get('error_description') ?? searchParams.get('error');
  const domainConnectProviderName = domainConnectStatus?.providerName ?? 'your DNS provider';
  const canWriteDomains = has({ permission: PermissionsEnum.ORG_SETTINGS_WRITE });

  const domainsHref = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.DOMAINS;

  const handleVerify = async () => {
    try {
      await verifyDomain.mutateAsync();
      showSuccessToast('Verification status refreshed.');
    } catch {
      showErrorToast('Failed to refresh verification status.');
    }
  };

  useEffect(() => {
    if (!domain) return;
    if (isMetadataExpanded) return;

    setMetadataDraft(formatMetadataDraft(domain.data));
  }, [domain, isMetadataExpanded]);

  const handleSaveMetadata = async () => {
    const parsed = parseDomainMetadataJson(metadataDraft);

    if (!parsed.ok) {
      showErrorToast(parsed.message);

      throw new Error(parsed.message);
    }

    if (!domain || normalizeMetadata(parsed.data) === normalizeMetadata(domain.data)) {
      setMetadataDraft(formatMetadataDraft(parsed.data));

      return;
    }

    try {
      await updateDomainMeta.mutateAsync({ data: parsed.data });
      showSuccessToast('Domain metadata saved.');
    } catch {
      showErrorToast('Failed to save metadata.');

      throw new Error('Failed to save metadata.');
    }
  };

  const handleAutoConfigure = async () => {
    if (!domain) return;

    setHasDomainConnectFailure(false);
    setHasSubmittedDomainConnectReturn(false);
    setDomainConnectApplyUrl(undefined);

    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('domainConnect');
      currentUrl.searchParams.delete('domainId');
      currentUrl.searchParams.delete('domain');
      currentUrl.searchParams.delete('error');
      currentUrl.searchParams.delete('error_description');

      const response = await startDomainAutoConfigure.mutateAsync(currentUrl.toString());
      try {
        window.location.assign(response.applyUrl);
      } catch {
        startDomainAutoConfigure.reset();
        setHasDomainConnectFailure(true);
        setDomainConnectApplyUrl(response.applyUrl);
        showErrorToast('Failed to open DNS provider. Use the setup link in the warning below.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start DNS auto-configuration.';
      showErrorToast(message);
    }
  };

  useEffect(() => {
    if (!domainConnectReturnStatus && !domainConnectError) return;
    if (hasHandledDomainConnectReturnRef.current) return;

    const cleanDomainConnectParams = () => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('domainConnect');
      nextSearchParams.delete('domainId');
      nextSearchParams.delete('domain');
      nextSearchParams.delete('error');
      nextSearchParams.delete('error_description');
      nextSearchParams.delete('state');

      navigate({ search: nextSearchParams.toString() ? `?${nextSearchParams.toString()}` : '' }, { replace: true });
    };

    hasHandledDomainConnectReturnRef.current = true;

    if (domainConnectError) {
      setHasDomainConnectFailure(true);
      showErrorToast('DNS auto-configuration was cancelled or failed.');
      cleanDomainConnectParams();

      return;
    }

    setHasDomainConnectFailure(false);
    setDomainConnectApplyUrl(undefined);
    setHasSubmittedDomainConnectReturn(true);
    void verifyDomain.mutateAsync().catch(() => refreshDomain());
    cleanDomainConnectParams();
  }, [domainConnectError, domainConnectReturnStatus, navigate, refreshDomain, searchParams, verifyDomain]);

  useEffect(() => {
    if (!domain) return;

    const previousStatus = previousDomainStatusRef.current;
    const hasJustVerified =
      domain.status === DomainStatusEnum.VERIFIED &&
      (previousStatus === DomainStatusEnum.PENDING || hasSubmittedDomainConnectReturn);

    if (hasJustVerified && !hasShownConnectedToastRef.current) {
      hasShownConnectedToastRef.current = true;
      showSuccessToast('Domain connected. Inbound email is ready.');
      setShowVerifiedConfetti(true);
    }

    previousDomainStatusRef.current = domain.status;
  }, [domain, hasSubmittedDomainConnectReturn]);

  useEffect(() => {
    if (!showVerifiedConfetti) return;

    const timeoutId = window.setTimeout(() => {
      setShowVerifiedConfetti(false);
    }, VERIFIED_CONFETTI_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [showVerifiedConfetti]);

  useEffect(() => {
    if (!showVerifiedConfetti) return;

    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [showVerifiedConfetti]);

  useEffect(() => {
    if (!hasSubmittedDomainConnectReturn) return;

    const timeoutId = window.setTimeout(() => {
      setHasSubmittedDomainConnectReturn(false);
    }, DOMAIN_CONNECT_VERIFYING_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [hasSubmittedDomainConnectReturn]);

  const handleRequestDelete = () => {
    if (!domain) return;

    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!domain) return;

    try {
      await deleteDomain.mutateAsync(domain.name);
      setIsDeleteModalOpen(false);
      showSuccessToast(`Domain "${domain.name}" deleted.`);
      navigate(domainsHref);
    } catch {
      showErrorToast('Failed to delete domain.');
    }
  };

  const headerStartItems = (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
      <CompactButton
        size="lg"
        className="mr-1 shrink-0"
        variant="ghost"
        icon={RiArrowLeftSLine}
        type="button"
        aria-label="Back to domains"
        onClick={() => navigate(domainsHref)}
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to={domainsHref}>Inbound Email</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            {isLoading ? (
              <Skeleton className="inline-block h-5 w-[min(100%,16ch)]" />
            ) : (
              <BreadcrumbPage className="flex min-w-0 items-center gap-1.5">
                <RiEarthLine className="text-text-sub size-4 shrink-0" aria-hidden />
                <span className="truncate">{domain?.name ?? ''}</span>
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );

  return (
    <DashboardLayout headerStartItems={headerStartItems}>
      <PageMeta title={domain?.name ?? 'Domain'} />

      {showVerifiedConfetti &&
        typeof document !== 'undefined' &&
        createPortal(
          <ReactConfetti
            width={viewportSize.width}
            height={viewportSize.height}
            recycle={false}
            numberOfPieces={1000}
            tweenDuration={VERIFIED_CONFETTI_DURATION_MS}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          />,
          document.body
        )}

      <div className="flex h-full flex-col">
        <header className="border-stroke-soft border-b px-4 pt-2 pb-2 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <h1 className="text-text-strong text-[18px] font-medium leading-6 tracking-tight">{domain?.name}</h1>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    mode="outline"
                    size="xs"
                    leadingIcon={RiMore2Fill}
                    type="button"
                    className="text-text-sub size-8 min-w-8 shrink-0 gap-0 rounded-md px-0"
                  >
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={() => {
                      setTimeout(() => handleRequestDelete(), 0);
                    }}
                    disabled={!canWriteDomains || deleteDomain.isPending || !domain}
                  >
                    Delete domain
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="flex gap-6 px-6 pt-4 pb-6">
            {/* Left: metadata */}
            <div className="shrink-0">
              <DetailsSidebar>
                <DetailsSidebarCard>
                  <DetailsSidebarRow label="Status">
                    {isLoading ? (
                      <Skeleton className="h-5 w-28" />
                    ) : domain ? (
                      <DomainStatusBadge status={domain.status} />
                    ) : null}
                  </DetailsSidebarRow>
                  <DetailsSidebarRow label="Domain">
                    {isLoading ? (
                      <Skeleton className="h-4 w-32" />
                    ) : (
                      <span className="text-text-sub text-label-xs">{domain?.name}</span>
                    )}
                  </DetailsSidebarRow>
                  <DetailsSidebarRow label="Provider">
                    {isLoading ? <Skeleton className="h-4 w-24" /> : <ProviderValue provider={domain?.dnsProvider} />}
                  </DetailsSidebarRow>
                  <DetailsSidebarRow label="Created on">
                    {isLoading ? (
                      <Skeleton className="h-4 w-28" />
                    ) : domain ? (
                      <TimeDisplayHoverCard date={domain.createdAt}>
                        <span className="text-text-sub font-code text-code-xs">{formatLongDate(domain.createdAt)}</span>
                      </TimeDisplayHoverCard>
                    ) : null}
                  </DetailsSidebarRow>

                  {!isLoading && domain && (
                    <ExpandableDetailsTextarea
                      label="Data"
                      value={metadataDraft}
                      onChange={setMetadataDraft}
                      onPersist={handleSaveMetadata}
                      onBeforeExpand={() => setMetadataDraft(formatMetadataDraft(domain.data))}
                      onExpandedChange={setIsMetadataExpanded}
                      placeholder={'{\n  "team": "support"\n}'}
                      disabled={!canWriteDomains || updateDomainMeta.isPending}
                      isPersisting={updateDomainMeta.isPending}
                      spellCheck={false}
                      textareaClassName="font-code text-code-xs min-h-[120px] resize-y"
                    />
                  )}
                </DetailsSidebarCard>

                {!isLoading && domain && (
                  <p className="text-label-xs font-medium">
                    <span className="text-text-soft">Last updated </span>
                    <span className="text-text-sub">
                      {formatDistanceToNow(new Date(domain.updatedAt), { addSuffix: true })}
                    </span>
                  </p>
                )}
              </DetailsSidebar>
            </div>

            {/* Right: warning + DNS records + routing */}
            <div className="min-w-0 flex-1 space-y-6 overflow-x-auto">
              {!isLoading && hasDomainConnectFailure && domain?.status === DomainStatusEnum.PENDING && (
                <InlineToast
                  variant="error"
                  title="Auto-configuration failed:"
                  description={
                    domainConnectApplyUrl ? (
                      <span>
                        Failed to open the DNS provider.{' '}
                        <a
                          href={domainConnectApplyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-base font-medium underline"
                        >
                          Open setup link
                        </a>{' '}
                        or add the MX record manually.
                      </span>
                    ) : (
                      'The DNS provider did not complete the setup. You can try again or add the MX record manually.'
                    )
                  }
                />
              )}
              {!isLoading &&
                hasSubmittedDomainConnectReturn &&
                !hasDomainConnectFailure &&
                domain?.status === DomainStatusEnum.PENDING && (
                  <InlineToast
                    variant="info"
                    title="DNS changes submitted:"
                    description="We're checking the MX record now. This can take a few minutes while DNS propagates."
                  />
                )}
              {!isLoading &&
                !hasDomainConnectFailure &&
                !hasSubmittedDomainConnectReturn &&
                domain?.status === DomainStatusEnum.PENDING && (
                  <InlineToast
                    variant="warning"
                    title="Warning:"
                    description="Domain isn't fully verified yet. Emails won't be received until MX records are configured."
                  />
                )}

              {/* DNS Records */}
              <CollapsibleSection
                title="DNS Records"
                actions={
                  <>
                    {domainConnectStatus?.available &&
                      domain?.status === DomainStatusEnum.PENDING &&
                      (!hasSubmittedDomainConnectReturn || hasDomainConnectFailure) && (
                        <AutoConfigureButton
                          providerName={domainConnectProviderName}
                          providerSlug={domain?.dnsProvider}
                          isLoading={startDomainAutoConfigure.isPending}
                          disabled={!canWriteDomains || startDomainAutoConfigure.isPending}
                          onClick={handleAutoConfigure}
                        />
                      )}
                  </>
                }
              >
                <div className="rounded-lg border bg-white p-3 space-y-3">
                  {/* Card header row */}
                  <div className="flex items-center gap-1 justify-between">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-foreground-900">
                        Receiving emails <span className="font-normal text-foreground-400">(MX)</span>
                      </p>
                      <RiInformationLine className="size-4 shrink-0 text-foreground-400" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <DnsActionButton
                        icon={RiRefreshLine}
                        isActive={isFetching}
                        onClick={handleVerify}
                        disabled={!canWriteDomains || isFetching}
                      >
                        Refresh status
                      </DnsActionButton>
                    </div>
                  </div>

                  {domainConnectStatus?.available &&
                    domain?.status === DomainStatusEnum.PENDING &&
                    hasSubmittedDomainConnectReturn &&
                    !hasDomainConnectFailure && (
                      <div className="border-stroke-soft bg-bg-weak flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <LoadingIndicator size="md" />
                          <div className="flex min-w-0 flex-col gap-1">
                            <p className="text-text-strong text-sm font-medium">
                              Verifying DNS at {domainConnectProviderName}
                            </p>
                            <p className="text-text-sub text-xs">
                              We&apos;re checking the MX record now. This usually finishes within a minute while DNS
                              propagates.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {!isDomainConnectStatusLoading &&
                    !domainConnectStatus?.available &&
                    domainConnectStatus?.reason &&
                    domainConnectStatus.reasonCode !== 'disabled' && (
                      <InlineToast variant="tip" title="Manual setup:" description={domainConnectStatus.reason} />
                    )}

                  <p className="text-xs font-medium text-foreground-400">
                    Add the following MX record at your DNS provider:
                  </p>

                  <Table containerClassname="rounded-none border-0 shadow-none overflow-visible">
                    <TableHeader className="shadow-none [&>tr>th]:bg-bg-weak [&>tr>th]:border-stroke-weak [&>tr>th]:border-y [&>tr>th:first-child]:rounded-l-lg [&>tr>th:first-child]:border-l [&>tr>th:last-child]:rounded-r-lg [&>tr>th:last-child]:border-r">
                      <TableRow>
                        <TableHead className="h-8 px-3 text-label-xs w-[60px]">Type</TableHead>
                        <TableHead className="h-8 px-3 text-label-xs">Name</TableHead>
                        <TableHead className="h-8 px-3 text-label-xs">Content</TableHead>
                        <TableHead className="h-8 px-3 text-label-xs w-[75px]">TTL</TableHead>
                        <TableHead className="h-8 px-3 text-label-xs w-[75px]">Priority</TableHead>
                        <TableHead className="h-8 px-3 text-label-xs w-[150px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow className="[&>td]:border-0">
                          <TableCell colSpan={6} className="px-3 py-4">
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ) : domain?.expectedDnsRecords?.length ? (
                        domain.expectedDnsRecords.map((record, i) => (
                          <TableRow key={i} className="[&>td]:border-0">
                            <TableCell className="font-code text-code-xs text-text-sub px-3 py-4">
                              {record.type}
                            </TableCell>
                            <TableCell className="font-code text-code-xs text-text-sub px-3 py-4">
                              <span className="inline-flex max-w-full items-center gap-1">
                                <span className="truncate">{record.name}</span>
                                <CopyButton valueToCopy={record.name} size="2xs" />
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate font-code text-code-xs text-text-sub px-3 py-4">
                              <span className="inline-flex max-w-full items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">{record.content}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm break-all font-code text-code-xs">
                                    {record.content}
                                  </TooltipContent>
                                </Tooltip>
                                <CopyButton valueToCopy={record.content} size="2xs" />
                              </span>
                            </TableCell>
                            <TableCell className="text-label-xs text-text-sub px-3 py-4">{record.ttl}</TableCell>
                            <TableCell className="text-label-xs text-text-sub px-3 py-4">{record.priority}</TableCell>
                            <TableCell className="px-3 py-4">
                              <MxRecordStatusBadge configured={domain.mxRecordConfigured} />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="[&>td]:border-0">
                          <TableCell colSpan={6} className="text-text-soft px-3 py-4 text-center text-label-xs">
                            No DNS records available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleSection>

              {/* Routing section */}
              {domain && (
                <CollapsibleSection
                  title="Routing"
                  open={isRoutingOpen}
                  onOpenChange={setIsRoutingOpen}
                  forceMountContent
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoutingOpen(true);
                        routingRef.current?.startAdding();
                      }}
                      disabled={!canWriteDomains}
                      className="text-foreground-900 hover:text-foreground-600 flex items-center gap-1 text-xs font-medium transition-colors disabled:text-text-disabled"
                    >
                      <RiAddLine className="size-3" />
                      Add new route
                    </button>
                  }
                >
                  <DomainRouting ref={routingRef} domain={domain} canWrite={canWriteDomains} />
                </CollapsibleSection>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        title="Delete domain"
        description={
          <span>
            Are you sure you want to delete <span className="font-bold">{domain?.name ?? ''}</span>? This action cannot
            be undone.
          </span>
        }
        confirmButtonText="Delete domain"
        confirmButtonVariant="error"
        isLoading={deleteDomain.isPending}
      />
    </DashboardLayout>
  );
}

type DnsActionButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function DnsActionButton({ icon: Icon, isActive, onClick, disabled, children }: DnsActionButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.08 }}
      className="text-foreground-500 hover:text-foreground-900 disabled:hover:text-foreground-400 disabled:text-foreground-400 flex items-center gap-1 rounded text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-stroke-strong focus-visible:ring-offset-1 disabled:cursor-not-allowed"
    >
      <Icon className={`size-3 ${isActive && !shouldReduceMotion ? 'animate-spin' : ''}`} />
      {children}
    </motion.button>
  );
}

type AutoConfigureButtonProps = {
  providerName: string;
  providerSlug?: string;
  isLoading: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function AutoConfigureButton({ providerName, providerSlug, isLoading, disabled, onClick }: AutoConfigureButtonProps) {
  const ProviderIcon = getProviderIcon(providerSlug);
  const isCloudflare = providerSlug?.toLowerCase() === 'cloudflare';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Auto configure with ${providerName}`}
      className="text-text-strong hover:bg-bg-weak focus-visible:ring-stroke-strong flex items-center gap-1 rounded-md px-1.5 py-0.5 text-label-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {ProviderIcon && (
        <ProviderIcon
          className={cn('size-4 shrink-0', isCloudflare ? 'text-[#f38020]' : 'text-text-strong')}
          aria-hidden
        />
      )}
      <span>Auto configure</span>
      {isLoading ? <LoadingIndicator size="sm" /> : null}
    </button>
  );
}

function getProviderIcon(provider?: string): IconType | null {
  const slug = provider?.toLowerCase();

  if (slug === 'cloudflare') return SiCloudflare;
  if (slug === 'vercel') return SiVercel;

  return null;
}

function ProviderValue({ provider }: { provider?: string }) {
  const label = provider ?? 'Unknown';
  const isCloudflare = provider?.toLowerCase() === 'cloudflare';
  const isVercel = provider?.toLowerCase() === 'vercel';

  return (
    <span className="text-text-sub flex items-center gap-1.5 font-code text-code-xs">
      {isCloudflare && <SiCloudflare className="size-4 shrink-0 text-[#f38020]" aria-hidden />}
      {isVercel && <SiVercel className="size-4 shrink-0 text-text-strong" aria-hidden />}
      {label}
    </span>
  );
}
