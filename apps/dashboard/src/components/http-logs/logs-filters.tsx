import { useOrganization } from '@clerk/clerk-react';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import type { LogsFilters } from '@/hooks/use-logs-url-state';
import { buildLogsDateFilters } from '@/utils/logs-filters.utils';
import { ROUTES } from '@/utils/routes';
import { IS_SELF_HOSTED } from '../../config';

interface RequestsFiltersProps {
  filters: LogsFilters;
  onFiltersChange: (filters: LogsFilters) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const STATUS_OPTIONS = [
  { label: '200 OK', value: '200' },
  { label: '201 Created', value: '201' },
  { label: '400 Bad Request', value: '400' },
  { label: '401 Unauthorized', value: '401' },
  { label: '403 Forbidden', value: '403' },
  { label: '404 Not Found', value: '404' },
  { label: '408 Request Timeout', value: '408' },
  { label: '422 Unprocessable Entity', value: '422' },
  { label: '429 Too Many Requests', value: '429' },
  { label: '500 Internal Server Error', value: '500' },
  { label: '502 Bad Gateway', value: '502' },
  { label: '503 Service Unavailable', value: '503' },
];

const URL_PATTERN_OPTIONS = [
  { label: '/v1/events/trigger', value: '/v1/events/trigger' },
  { label: '/v1/events/trigger/bulk', value: '/v1/events/trigger/bulk' },
  { label: '/v1/events/trigger/broadcast', value: '/v1/events/trigger/broadcast' },
];

const UpgradeCtaIcon: React.ComponentType<{ className?: string }> = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={ROUTES.SETTINGS_BILLING + '?utm_source=logs-retention'}
          className="block flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <Badge color="purple" size="sm" variant="lighter">
            Upgrade
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>Upgrade your plan to unlock extended retention periods</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
};

export function RequestsFilters({ filters, onFiltersChange, onClearFilters, hasActiveFilters }: RequestsFiltersProps) {
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();

  const form = useForm<LogsFilters>({
    defaultValues: filters,
  });

  useEffect(() => {
    form.reset(filters);
  }, [filters, form]);

  const maxLogsRetentionOptions = useMemo(() => {
    const missingSubscription = !subscription && !IS_SELF_HOSTED;

    if (!organization || missingSubscription) {
      return [];
    }

    return buildLogsDateFilters({
      organization,
      apiServiceLevel: subscription?.apiServiceLevel,
    }).map((option) => ({
      ...option,
      icon: option.disabled ? UpgradeCtaIcon : undefined,
    }));
  }, [organization, subscription]);

  const handleStatusChange = (values: string[]) => {
    form.setValue('status', values);
    onFiltersChange({
      status: values,
      transactionId: form.getValues('transactionId'),
      urlPattern: form.getValues('urlPattern'),
      createdGte: form.getValues('createdGte'),
    });
  };

  const handleTransactionIdChange = (value: string) => {
    form.setValue('transactionId', value);
    onFiltersChange({
      status: form.getValues('status'),
      transactionId: value,
      urlPattern: form.getValues('urlPattern'),
      createdGte: form.getValues('createdGte'),
    });
  };

  const handleCreatedChange = (values: string[]) => {
    const selectedCreatedGte = values[0]; // Single selection
    form.setValue('createdGte', selectedCreatedGte);
    onFiltersChange({
      status: form.getValues('status'),
      transactionId: form.getValues('transactionId'),
      urlPattern: form.getValues('urlPattern'),
      createdGte: selectedCreatedGte,
    });
  };

  const handleUrlPatternChange = (values: string[]) => {
    const selectedUrlPattern = values[0]; // Single selection
    form.setValue('urlPattern', selectedUrlPattern || '');
    onFiltersChange({
      status: form.getValues('status'),
      transactionId: form.getValues('transactionId'),
      urlPattern: selectedUrlPattern || '',
      createdGte: form.getValues('createdGte'),
    });
  };

  return (
    <div className="flex items-center gap-2">
      <FacetedFormFilter
        size="small"
        type="single"
        hideClear
        hideSearch
        hideTitle
        title="Time period"
        options={maxLogsRetentionOptions}
        selected={filters.createdGte ? [filters.createdGte] : []}
        onSelect={handleCreatedChange}
        icon={CalendarIcon}
      />
      <FacetedFormFilter
        type="text"
        size="small"
        title="Transaction ID"
        value={filters.transactionId}
        onChange={handleTransactionIdChange}
        placeholder="Search by transaction ID..."
      />
      <FacetedFormFilter
        size="small"
        type="multi"
        title="Status"
        placeholder="Filter by status"
        options={STATUS_OPTIONS}
        selected={filters.status}
        onSelect={handleStatusChange}
      />
      <FacetedFormFilter
        size="small"
        type="single"
        title="API Endpoint"
        placeholder="Filter by API endpoint"
        options={URL_PATTERN_OPTIONS}
        selected={filters.urlPattern ? [filters.urlPattern] : []}
        onSelect={handleUrlPatternChange}
      />
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="text-foreground-600 hover:text-foreground-950 text-sm font-medium">
          Clear filters
        </button>
      )}
    </div>
  );
}
