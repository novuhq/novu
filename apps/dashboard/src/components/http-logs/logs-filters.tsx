import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { RiCalendarLine } from 'react-icons/ri';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import type { LogsFilters } from '@/hooks/use-logs-url-state';

interface LogsFiltersProps {
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

const CREATED_OPTIONS = [
  { label: 'Last 24 Hours', value: '24' },
  { label: '7 Days', value: '168' }, // 7 * 24
  { label: '30 Days', value: '720' }, // 30 * 24
  { label: '60 Days', value: '1440' }, // 60 * 24
  { label: '90 Days', value: '2160' }, // 90 * 24
];

export function LogsFilters({ filters, onFiltersChange, onClearFilters, hasActiveFilters }: LogsFiltersProps) {
  const form = useForm<LogsFilters>({
    defaultValues: filters,
  });

  useEffect(() => {
    form.reset(filters);
  }, [filters, form]);

  const handleStatusChange = (values: string[]) => {
    form.setValue('status', values);
    onFiltersChange({
      status: values,
      transactionId: form.getValues('transactionId'),
      created: form.getValues('created'),
    });
  };

  const handleTransactionIdChange = (value: string) => {
    form.setValue('transactionId', value);
    onFiltersChange({
      status: form.getValues('status'),
      transactionId: value,
      created: form.getValues('created'),
    });
  };

  const handleCreatedChange = (values: string[]) => {
    const selectedCreated = values[0]; // Single selection
    form.setValue('created', selectedCreated);
    onFiltersChange({
      status: form.getValues('status'),
      transactionId: form.getValues('transactionId'),
      created: selectedCreated,
    });
  };

  const getCreatedTitle = () => {
    if (!filters.created) return '60D';
    const selectedOption = CREATED_OPTIONS.find((option) => option.value === filters.created);
    return selectedOption
      ? selectedOption.label.replace(' Days', 'D').replace(' Day', 'D').replace('Last ', '')
      : '60D';
  };

  return (
    <div className="flex items-center gap-2 py-2.5">
      <FacetedFormFilter
        size="small"
        type="single"
        title={getCreatedTitle()}
        icon={RiCalendarLine}
        options={CREATED_OPTIONS}
        selected={filters.created ? [filters.created] : []}
        onSelect={handleCreatedChange}
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
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="text-foreground-600 hover:text-foreground-950 text-sm font-medium">
          Clear filters
        </button>
      )}
    </div>
  );
}
