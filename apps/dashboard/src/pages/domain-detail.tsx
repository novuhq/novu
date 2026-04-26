import { DomainStatusEnum } from '@novu/shared';
import { formatDistanceToNow } from 'date-fns';
import { useRef, useState } from 'react';
import {
  RiAddLine,
  RiAlertFill,
  RiArrowLeftSLine,
  RiEarthLine,
  RiInformationLine,
  RiMore2Fill,
  RiRefreshLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { SiCloudflare } from 'react-icons/si';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DomainRouting, type DomainRoutingHandle } from '@/components/domains/domain-routing';
import { RetryVerificationIcon } from '@/components/icons/retry-verification';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchDomain, useRefreshDomain } from '@/hooks/use-domain';
import { useDeleteDomain } from '@/hooks/use-domains';
import { buildRoute, ROUTES } from '@/utils/routes';

function DomainStatusBadge({ status }: { status: DomainStatusEnum }) {
  if (status === DomainStatusEnum.VERIFIED) {
    return (
      <span className="bg-success-lighter text-success-base inline-flex items-center gap-1 rounded-6 px-1 py-0.5 text-label-xs">
        <RiShieldCheckLine className="size-4 shrink-0" />
        Verified
      </span>
    );
  }

  return (
    <span className="bg-warning-lighter text-warning-base inline-flex items-center gap-1 rounded-6 px-1 py-0.5 text-label-xs">
      <RiAlertFill className="size-4 shrink-0" />
      Pending verification
    </span>
  );
}

function MxRecordStatusBadge({ configured }: { configured: boolean }) {
  if (configured) {
    return (
      <Badge variant="lighter" color="green" size="md">
        <RiShieldCheckLine className="size-4" />
        Verified
      </Badge>
    );
  }

  return (
    <Badge variant="lighter" color="orange" size="md">
      <RiAlertFill className="size-4" />
      Pending
    </Badge>
  );
}

export function DomainDetailPage() {
  const { domainId } = useParams<{ domainId: string }>();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  const { data: domain, isLoading, isFetching } = useFetchDomain(domainId);
  const { refresh: refreshDomain } = useRefreshDomain(domainId);
  const deleteDomain = useDeleteDomain();
  const routingRef = useRef<DomainRoutingHandle>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const domainsHref = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.DOMAINS;

  const handleVerify = async () => {
    try {
      await refreshDomain();
      showSuccessToast('Verification status refreshed.');
    } catch {
      showErrorToast('Failed to refresh verification status.');
    }
  };

  const handleRequestDelete = () => {
    if (!domain) return;

    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!domain) return;

    try {
      await deleteDomain.mutateAsync(domain._id);
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
            <BreadcrumbLink to={domainsHref}>Domains</BreadcrumbLink>
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

      <div className="flex h-full flex-col">
        <header className="border-b px-4 pt-2 pb-2 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <h1 className="text-text-strong text-[18px] font-medium leading-6 tracking-tight">{domain?.name}</h1>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                mode="outline"
                variant="secondary"
                size="xs"
                onClick={handleVerify}
                disabled={isFetching || isLoading}
                className="text-[12px] leading-[16px]"
              >
                <div className="flex h-4 items-center">
                  <RetryVerificationIcon className="size-3 mr-2" />
                  Retry verification
                </div>
              </Button>
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
                    disabled={deleteDomain.isPending || !domain}
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
          <div className="flex gap-0 h-full">
            {/* Left: metadata */}
            <div className="w-[340px] shrink-0 px-6 py-8">
              <div className="flex w-[300px] flex-col gap-2.5">
                <div className="bg-bg-weak rounded-4 p-1">
                  <MetaRow label="Status">
                    {isLoading ? (
                      <Skeleton className="h-5 w-28" />
                    ) : domain ? (
                      <DomainStatusBadge status={domain.status} />
                    ) : null}
                  </MetaRow>
                  <MetaRow label="Domain">
                    {isLoading ? (
                      <Skeleton className="h-4 w-32" />
                    ) : (
                      <span className="text-text-sub text-label-xs">{domain?.name}</span>
                    )}
                  </MetaRow>
                  <MetaRow label="Provider">
                    {isLoading ? <Skeleton className="h-4 w-24" /> : <ProviderValue provider={domain?.dnsProvider} />}
                  </MetaRow>
                  <MetaRow label="Created on">
                    {isLoading ? (
                      <Skeleton className="h-4 w-28" />
                    ) : domain ? (
                      <span className="text-text-sub font-code text-code-xs">
                        {new Date(domain.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : null}
                  </MetaRow>
                </div>

                {!isLoading && domain && (
                  <p className="text-text-soft text-label-xs">
                    Last updated{' '}
                    <span className="text-text-sub">
                      {formatDistanceToNow(new Date(domain.updatedAt), { addSuffix: true })}
                    </span>
                  </p>
                )}

                <Separator />
              </div>
            </div>

            {/* Right: warning + DNS records + routing */}
            <div className="flex-1 overflow-auto px-6 py-8 space-y-6">
              {/* Pending warning */}
              {!isLoading && domain?.status === DomainStatusEnum.PENDING && (
                <InlineToast
                  variant="warning"
                  title="Warning:"
                  description="Domain isn't fully verified yet. Emails won't be received until MX records are configured."
                />
              )}

              {/* DNS Records */}
              <CollapsibleSection title="DNS Records">
                <div className="rounded-lg border bg-white p-3 space-y-3">
                  {/* Card header row */}
                  <div className="flex items-center gap-1 justify-between">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-foreground-900">
                        Receiving emails <span className="font-normal text-foreground-400">(MX)</span>
                      </p>
                      <RiInformationLine className="size-4 shrink-0 text-foreground-400" />
                    </div>
                    <button
                      className="text-foreground-500 hover:text-foreground-900 flex items-center gap-1 text-xs transition-colors"
                      onClick={handleVerify}
                      disabled={isFetching}
                      type="button"
                    >
                      <RiRefreshLine className="size-3" />
                      Refresh status
                    </button>
                  </div>

                  <p className="text-xs font-medium text-foreground-400">
                    Update your DNS records on Cloudflare to match the following:
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
                              {record.name}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate font-code text-code-xs text-text-sub px-3 py-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate">{record.content}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm break-all font-code text-code-xs">
                                  {record.content}
                                </TooltipContent>
                              </Tooltip>
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
                  actions={
                    <button
                      type="button"
                      onClick={() => routingRef.current?.startAdding()}
                      className="text-foreground-900 hover:text-foreground-600 flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                      <RiAddLine className="size-3" />
                      Add new route
                    </button>
                  }
                >
                  <DomainRouting ref={routingRef} domain={domain} />
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

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="flex h-6 items-center justify-between gap-4 px-1.5">
        <p className="text-text-soft text-label-xs shrink-0">{label}</p>
        <div className="flex items-center text-right">{children}</div>
      </div>
    </div>
  );
}

function ProviderValue({ provider }: { provider?: string }) {
  const label = provider ?? 'Unknown';
  const isCloudflare = provider?.toLowerCase() === 'cloudflare';

  return (
    <span className="text-text-sub flex items-center gap-1.5 font-code text-code-xs">
      {isCloudflare && <SiCloudflare className="size-4 shrink-0 text-[#f38020]" aria-hidden />}
      {label}
    </span>
  );
}
