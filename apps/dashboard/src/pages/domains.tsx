import { ApiServiceLevelEnum, DomainStatusEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { RiAddLine, RiMore2Fill } from 'react-icons/ri';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { DomainResponse } from '@/api/domains';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AddDomainDialog } from '@/components/domains/add-domain-dialog';
import { DomainsIllustrationSvg, DomainsPaywallBanner } from '@/components/domains/domains-paywall-banner';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import { TablePaginationFooter } from '@/components/primitives/table-pagination-footer';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteDomain, useFetchDomains } from '@/hooks/use-domains';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { buildRoute, ROUTES } from '@/utils/routes';

const DOMAINS_TABLE_ID = 'domains-list';

function DomainStatusBadge({ status }: { status: DomainStatusEnum }) {
  if (status === DomainStatusEnum.VERIFIED) {
    return (
      <Badge variant="light" color="green">
        Verified
      </Badge>
    );
  }

  return (
    <Badge variant="light" color="orange">
      Pending
    </Badge>
  );
}

function DomainRow({
  domain,
  environmentSlug,
  onRequestDelete,
  isDeleting,
}: {
  domain: DomainResponse;
  environmentSlug: string;
  onRequestDelete: (domain: DomainResponse) => void;
  isDeleting: boolean;
}) {
  const navigate = useNavigate();

  const handleRowClick = () => {
    navigate(buildRoute(ROUTES.DOMAIN_DETAIL, { environmentSlug, domain: domain.name }));
  };

  return (
    <TableRow className="hover:bg-neutral-alpha-50 cursor-pointer" onClick={handleRowClick}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-code text-sm font-medium">{domain.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <DomainStatusBadge status={domain.status} />
      </TableCell>
      <TableCell className="text-foreground-500 text-sm">
        {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="text-foreground-500 text-sm">
        {formatDistanceToNow(new Date(domain.updatedAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="w-12 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <CompactButton icon={RiMore2Fill} variant="ghost" className="z-10 h-8 w-8 p-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={() => {
                setTimeout(() => onRequestDelete(domain), 0);
              }}
              disabled={isDeleting}
            >
              Delete domain
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function DomainsEmptyState({ onCreateDomain }: { onCreateDomain: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-4">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="mb-[50px]">
            <DomainsIllustrationSvg />
          </div>
          <h2 className="text-foreground-900 text-label-md">Create your first domain</h2>
          <p className="text-text-soft text-label-xs mb-3 max-w-[300px]">
            Receive emails on your domain and route them to agents or webhooks.
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-text-soft text-label-xs mb-3 text-center">
            Add a domain to start receiving inbound emails.
          </p>
          <Button
            variant="primary"
            mode="gradient"
            size="xs"
            className="mb-3.5"
            onClick={onCreateDomain}
            leadingIcon={RiAddLine}
          >
            Create first domain
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DomainsPage() {
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { pageSize, setPageSize } = usePersistedPageSize({
    tableId: DOMAINS_TABLE_ID,
    defaultPageSize: 10,
  });
  const { subscription } = useFetchSubscription();
  const deleteDomain = useDeleteDomain();
  const [search, setSearch] = useState('');
  const beforeCursor = searchParams.get('before') ?? undefined;
  const afterCursor = beforeCursor ? undefined : (searchParams.get('after') ?? undefined);
  const { data: domainsResponse, isLoading } = useFetchDomains({
    limit: pageSize,
    ...(afterCursor ? { after: afterCursor } : {}),
    ...(beforeCursor ? { before: beforeCursor } : {}),
    ...(search ? { name: search } : {}),
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<DomainResponse | null>(null);

  const environmentSlug = currentEnvironment?.slug;
  const isTableLoading = isLoading || !environmentSlug;

  const domainsEnabled = getFeatureForTierAsBoolean(
    FeatureNameEnum.DOMAINS_BOOLEAN,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );
  const domains = domainsResponse?.data ?? [];
  const hasActiveCursor = Boolean(afterCursor || beforeCursor);
  const isEmptyDomainsState = !isTableLoading && !search && !hasActiveCursor && domainsResponse?.totalCount === 0;

  const updateCursorParams = ({ after, before }: { after?: string; before?: string }, replace = false) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('after');
    nextParams.delete('before');

    if (after) nextParams.set('after', after);
    if (before) nextParams.set('before', before);

    const query = nextParams.toString();

    navigate(query ? `${location.pathname}?${query}` : location.pathname, { replace });
  };

  const resetCursorParams = () => {
    updateCursorParams({}, true);
  };

  const handleNextPage = () => {
    if (!domainsResponse?.next) return;

    updateCursorParams({ after: domainsResponse.next });
  };

  const handlePreviousPage = () => {
    if (!domainsResponse?.previous) return;

    updateCursorParams({ before: domainsResponse.previous });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    resetCursorParams();
  };

  const handleRequestDelete = (domain: DomainResponse) => {
    setDomainToDelete(domain);
  };

  const handleConfirmDelete = async () => {
    if (!domainToDelete) {
      return;
    }

    try {
      await deleteDomain.mutateAsync(domainToDelete.name);
      setDomainToDelete(null);
      showSuccessToast(`Domain "${domainToDelete.name}" deleted.`);
    } catch {
      showErrorToast('Failed to delete domain.');
    }
  };

  if (!domainsEnabled) {
    return (
      <DashboardLayout
        headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Inbound Email</h1>}
      >
        <PageMeta title="Inbound Email" />
        <DomainsPaywallBanner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Inbound Email</h1>}>
      <PageMeta title="Inbound Email" />
      <div className="flex h-full w-full flex-col">
        {isEmptyDomainsState ? (
          <DomainsEmptyState onCreateDomain={() => setIsAddDialogOpen(true)} />
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 py-2.5">
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Search"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    resetCursorParams();
                  }}
                  placeholder="Search domains..."
                />
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <RiAddLine className="size-4" />
                Add domain
              </Button>
            </div>

            <div className="min-h-0 flex-1">
              <Table
                isLoading={isTableLoading}
                loadingRowsCount={pageSize}
                containerClassname="flex max-h-full min-h-0 flex-col overflow-auto bg-bg-white"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last updated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                {!isTableLoading && environmentSlug && (
                  <TableBody>
                    {domains.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-foreground-400 py-16 text-center">
                          No domains match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      domains.map((domain) => (
                        <DomainRow
                          key={domain._id}
                          domain={domain}
                          environmentSlug={environmentSlug}
                          onRequestDelete={handleRequestDelete}
                          isDeleting={deleteDomain.isPending}
                        />
                      ))
                    )}
                  </TableBody>
                )}
                {!isTableLoading && domains.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <TablePaginationFooter
                          pageSize={pageSize}
                          currentPageItemsCount={domains.length}
                          onPreviousPage={handlePreviousPage}
                          onNextPage={handleNextPage}
                          onPageSizeChange={handlePageSizeChange}
                          hasPreviousPage={!!domainsResponse?.previous}
                          hasNextPage={!!domainsResponse?.next}
                          itemName="domains"
                          totalCount={domainsResponse?.totalCount}
                          totalCountCapped={domainsResponse?.totalCountCapped}
                          pageSizeOptions={[10, 20, 50]}
                        />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </>
        )}
      </div>

      <AddDomainDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <ConfirmationModal
        open={!!domainToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setDomainToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete domain"
        description={
          <span>
            Are you sure you want to delete <span className="font-bold">{domainToDelete?.name ?? ''}</span>? This action
            cannot be undone.
          </span>
        }
        confirmButtonText="Delete domain"
        confirmButtonVariant="error"
        isLoading={deleteDomain.isPending}
      />
    </DashboardLayout>
  );
}
