import { DomainStatusEnum } from '@novu/shared';
import { formatDistanceToNow } from 'date-fns';
import { useRef } from 'react';
import {
  RiAddLine,
  RiAlertFill,
  RiInformationLine,
  RiMore2Fill,
  RiRefreshLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchDomain, useRefreshDomain } from '@/hooks/use-domain';
import { useDeleteDomain } from '@/hooks/use-domains';
import { buildRoute, ROUTES } from '@/utils/routes';

const DEMO_DOMAIN_SUFFIX = 'novu.co';

function isDemoDomain(domainName: string): boolean {
  return domainName.endsWith(`.${DEMO_DOMAIN_SUFFIX}`) || domainName === DEMO_DOMAIN_SUFFIX;
}

function DomainStatusBadge({ status }: { status: DomainStatusEnum }) {
  if (status === DomainStatusEnum.VERIFIED) {
    return (
      <Badge variant="light" color="green">
        <RiShieldCheckLine className="mr-1 size-3" />
        Verified
      </Badge>
    );
  }

  return (
    <Badge variant="light" color="orange">
      Pending verified
    </Badge>
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
  const isDemo = domain ? isDemoDomain(domain.name) : false;

  const domainsHref = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.DOMAINS;

  const handleVerify = () => {
    refreshDomain();
    showSuccessToast('Verification status refreshed.');
  };

  const handleDelete = async () => {
    if (!domain) return;
    try {
      await deleteDomain.mutateAsync(domain._id);
      showSuccessToast(`Domain "${domain.name}" deleted.`);
      navigate(domainsHref);
    } catch {
      showErrorToast('Failed to delete domain.');
    }
  };

  return (
    <DashboardLayout>
      <PageMeta title={domain?.name ?? 'Domain'} />

      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink to={domainsHref}>Domains</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{isLoading ? <Skeleton className="h-4 w-24" /> : (domain?.name ?? '')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            {isLoading ? <Skeleton className="h-6 w-40" /> : <h1 className="text-xl font-semibold">{domain?.name}</h1>}
            {!isLoading && domain && (
              <p className="text-foreground-400 mt-0.5 text-sm">
                Created {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              mode="outline"
              variant="secondary"
              size="sm"
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
                <CompactButton icon={RiMore2Fill} variant="stroke" className="h-8 w-8 p-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDemo ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block">
                        <DropdownMenuItem disabled className="text-destructive focus:text-destructive">
                          Delete domain
                        </DropdownMenuItem>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>The demo domain cannot be deleted.</TooltipContent>
                  </Tooltip>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={handleDelete}
                    disabled={deleteDomain.isPending}
                  >
                    Delete domain
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="flex gap-0 h-full">
            {/* Left: metadata */}
            <div className="w-72 shrink-0 px-6 py-8 space-y-3">
              <MetaRow label="Status">
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : domain ? (
                  <DomainStatusBadge status={domain.status} />
                ) : null}
              </MetaRow>
              <MetaRow label="Domain">
                {isLoading ? <Skeleton className="h-4 w-32" /> : <span className="text-sm">{domain?.name}</span>}
              </MetaRow>
              <MetaRow label="Provider">
                {isLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span className="text-sm">{domain?.dnsProvider ?? 'Unknown'}</span>
                )}
              </MetaRow>
              <MetaRow label="Created on">
                {isLoading ? (
                  <Skeleton className="h-4 w-28" />
                ) : domain ? (
                  <span className="text-sm">
                    {new Date(domain.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                ) : null}
              </MetaRow>
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

                  <div className="rounded-lg overflow-hidden border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-[60px]">Type</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Content</TableHead>
                          <TableHead className="text-xs w-[75px]">TTL</TableHead>
                          <TableHead className="text-xs w-[75px]">Priority</TableHead>
                          <TableHead className="text-xs w-[150px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Skeleton className="h-8 w-full" />
                            </TableCell>
                          </TableRow>
                        ) : domain?.expectedDnsRecords?.length ? (
                          domain.expectedDnsRecords.map((record, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs font-medium text-foreground-500">
                                {record.type}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-medium text-foreground-500">
                                {record.name}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate font-mono text-xs font-medium text-foreground-500">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">{record.content}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm break-all font-mono text-xs">
                                    {record.content}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-xs text-foreground-500">{record.ttl}</TableCell>
                              <TableCell className="text-xs text-foreground-500">{record.priority}</TableCell>
                              <TableCell>
                                <MxRecordStatusBadge configured={domain.mxRecordConfigured} />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-foreground-400 text-center text-sm">
                              No DNS records available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
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
    </DashboardLayout>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <p className="text-foreground-400 shrink-0 text-sm">{label}</p>
      <div className="text-foreground-900 text-right">{children}</div>
    </div>
  );
}
