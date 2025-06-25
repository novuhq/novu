import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
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
    });
  };

  const handleTransactionIdChange = (value: string) => {
    form.setValue('transactionId', value);
    onFiltersChange({
      status: form.getValues('status'),
      transactionId: value,
    });
  };

  return (
    <div className="flex items-center gap-2 py-2.5">
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
