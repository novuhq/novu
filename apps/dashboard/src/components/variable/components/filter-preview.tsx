import { useEffect, useState } from 'react';
import { FilterWithParam } from '../types';
import { processFilters } from '../utils/process-filters';

type FilterPreviewProps = {
  value: string;
  filters: FilterWithParam[];
};

export function FilterPreview({ value, filters }: FilterPreviewProps) {
  const [processedValue, setProcessedValue] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !filters.length) {
      setProcessedValue(null);
      return;
    }

    let isMounted = true;

    processFilters(value, filters).then((result) => {
      if (isMounted) {
        setProcessedValue(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [value, filters]);

  if (!processedValue) return null;

  const isJsonLike = processedValue.startsWith('[') || processedValue.startsWith('{');

  return (
    <div className="text-text-sub bg-bg-weak border-stroke-soft rounded-md border border-dashed px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-text-soft text-2xs">Result:</span>
        <code className={`text-2xs ${isJsonLike ? 'whitespace-pre font-mono' : ''}`}>{processedValue}</code>
      </div>
    </div>
  );
}
