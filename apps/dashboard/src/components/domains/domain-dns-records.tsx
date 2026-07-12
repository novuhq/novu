import type { DomainResponse } from '@/api/domains';
import { ApexDomainMxWarning } from '@/components/domains/apex-domain-mx-warning';
import { AnimatedBadgeDot, Badge } from '@/components/primitives/badge';
import { CopyButton } from '@/components/primitives/copy-button';
import { Skeleton } from '@/components/primitives/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { isApexInboundDomain } from '@/utils/inbound-domain';

function MxRecordStatusBadge({ configured }: { configured: boolean }) {
  return (
    <Badge variant="lighter" color={configured ? 'green' : 'orange'} size="md">
      <AnimatedBadgeDot color={configured ? 'green' : 'orange'} size="md" variant="lighter" />
      {configured ? 'Verified' : 'Pending'}
    </Badge>
  );
}

function DnsRecordsBody({ domain, isLoading }: { domain?: DomainResponse; isLoading: boolean }) {
  if (isLoading) {
    return (
      <TableRow className="[&>td]:border-0">
        <TableCell colSpan={6} className="px-2 py-4">
          <Skeleton className="h-8 w-full" />
        </TableCell>
      </TableRow>
    );
  }

  if (!domain?.expectedDnsRecords?.length) {
    return (
      <TableRow className="[&>td]:border-0">
        <TableCell colSpan={6} className="text-text-soft px-2 py-4 text-center text-label-xs">
          No DNS records available.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {domain.expectedDnsRecords.map((record, i) => (
        <TableRow key={i} className="[&>td]:border-0">
          <TableCell className="font-code text-code-xs text-text-sub px-2 py-4">{record.type}</TableCell>
          <TableCell className="font-code text-code-xs text-text-sub px-2 py-4">
            <span className="flex min-w-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="min-w-0 flex-1 truncate">{record.name}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm break-all font-code text-code-xs">{record.name}</TooltipContent>
              </Tooltip>
              <CopyButton valueToCopy={record.name} size="2xs" className="shrink-0" />
            </span>
          </TableCell>
          <TableCell className="font-code text-code-xs text-text-sub px-2 py-4">
            <span className="flex min-w-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="min-w-0 flex-1 truncate">{record.content}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm break-all font-code text-code-xs">{record.content}</TooltipContent>
              </Tooltip>
              <CopyButton valueToCopy={record.content} size="2xs" className="shrink-0" />
            </span>
          </TableCell>
          <TableCell className="text-label-xs text-text-sub px-2 py-4">{record.ttl}</TableCell>
          <TableCell className="text-label-xs text-text-sub px-2 py-4">{record.priority}</TableCell>
          <TableCell className="px-2 py-4">
            <MxRecordStatusBadge configured={domain.mxRecordConfigured} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

type DomainDnsRecordsProps = {
  domain?: DomainResponse;
  isLoading?: boolean;
};

/**
 * Presentational MX DNS-records table shared by the domain-detail page and the
 * agent inline custom-domain sheet. Renders the expected MX record(s) with copy
 * affordances and a per-record verification status badge.
 */
export function DomainDnsRecords({ domain, isLoading = false }: DomainDnsRecordsProps) {
  const showApexWarning = domain ? isApexInboundDomain(domain.name) : false;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-foreground-400">Add the following MX record at your DNS provider:</p>

      {showApexWarning && <ApexDomainMxWarning />}

      <Table className="table-fixed" containerClassname="rounded-none border-0 shadow-none overflow-x-auto">
        <TableHeader className="shadow-none [&>tr>th]:bg-bg-weak [&>tr>th]:border-stroke-weak [&>tr>th]:border-y [&>tr>th:first-child]:rounded-l-lg [&>tr>th:first-child]:border-l [&>tr>th:last-child]:rounded-r-lg [&>tr>th:last-child]:border-r">
          <TableRow>
            <TableHead className="h-8 px-2 text-label-xs w-[52px]">Type</TableHead>
            <TableHead className="h-8 px-2 text-label-xs">Name</TableHead>
            <TableHead className="h-8 px-2 text-label-xs">Content</TableHead>
            <TableHead className="h-8 px-2 text-label-xs w-[56px]">TTL</TableHead>
            <TableHead className="h-8 px-2 text-label-xs w-[72px]">Priority</TableHead>
            <TableHead className="h-8 px-2 text-label-xs w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <DnsRecordsBody domain={domain} isLoading={isLoading} />
        </TableBody>
      </Table>
    </div>
  );
}
