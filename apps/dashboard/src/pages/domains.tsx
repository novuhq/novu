import { ApiServiceLevelEnum, DomainStatusEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { RiAddLine, RiMore2Fill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { DomainResponse } from '@/api/domains';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AddDomainDialog } from '@/components/domains/add-domain-dialog';
import { DomainsPaywallBanner } from '@/components/domains/domains-paywall-banner';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteDomain, useFetchDomains } from '@/hooks/use-domains';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { buildRoute, ROUTES } from '@/utils/routes';

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
    navigate(buildRoute(ROUTES.DOMAIN_DETAIL, { environmentSlug, domainId: domain._id }));
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

export function DomainsPage() {
  const { currentEnvironment } = useEnvironment();
  const { data: domains, isLoading } = useFetchDomains();
  const { subscription } = useFetchSubscription();
  const deleteDomain = useDeleteDomain();
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<DomainResponse | null>(null);

  const environmentSlug = currentEnvironment?.slug;
  const isTableLoading = isLoading || !environmentSlug;

  const domainsEnabled = getFeatureForTierAsBoolean(
    FeatureNameEnum.DOMAINS_BOOLEAN,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );
  const filtered = (domains ?? []).filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const handleRequestDelete = (domain: DomainResponse) => {
    setDomainToDelete(domain);
  };

  const handleConfirmDelete = async () => {
    if (!domainToDelete) {
      return;
    }

    try {
      await deleteDomain.mutateAsync(domainToDelete._id);
      setDomainToDelete(null);
      showSuccessToast(`Domain "${domainToDelete.name}" deleted.`);
    } catch {
      showErrorToast('Failed to delete domain.');
    }
  };

  if (!domainsEnabled) {
    return (
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Domains</h1>}>
        <PageMeta title="Domains" />
        <DomainsPaywallBanner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Domains</h1>}>
      <PageMeta title="Domains" />
      <div className="flex h-full w-full flex-col">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 py-2.5">
            <FacetedFormFilter
              type="text"
              size="small"
              title="Search"
              value={search}
              onChange={setSearch}
              placeholder="Search domains..."
            />
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <RiAddLine className="size-4" />
            Add domain
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Table isLoading={isTableLoading} loadingRowsCount={3}>
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
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-foreground-400 py-16 text-center">
                      {search
                        ? 'No domains match your search.'
                        : 'No domains yet. Add your first domain to get started.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((domain) => (
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
          </Table>
        </div>
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
