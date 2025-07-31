import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';

type TopicSubscriberFilterProps = {
  topicKey: string;
  onSubscriberIdChange: (subscriberId?: string) => void;
  subscriberId?: string;
  isLoading?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  className?: string;
};

export function TopicSubscriberFilter({
  topicKey,
  onSubscriberIdChange,
  subscriberId,
  isLoading,
  onLoadingChange,
  className,
}: TopicSubscriberFilterProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [subscriberIdValue, setSubscriberIdValue] = useState(subscriberId || '');

  useEffect(() => {
    setSubscriberIdValue(subscriberId || '');
  }, [subscriberId]);

  const clearDebounceTimeout = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  };

  const debouncedSubscriberIdChange = (value: string) => {
    clearDebounceTimeout();

    debounceTimeoutRef.current = setTimeout(() => {
      onLoadingChange?.(true);

      queryClient.cancelQueries({
        queryKey: ['topic-subscriptions', currentEnvironment?._id, topicKey],
      });

      onSubscriberIdChange(value.trim() ? value : undefined);

      debounceTimeoutRef.current = null;
    }, 400);
  };

  const handleSubscriberIdChange = (value: string) => {
    setSubscriberIdValue(value);
    debouncedSubscriberIdChange(value);
  };

  const handleReset = () => {
    clearDebounceTimeout();
    onLoadingChange?.(true);
    setSubscriberIdValue('');
    onSubscriberIdChange(undefined);
  };

  useEffect(() => {
    return clearDebounceTimeout;
  }, []);

  return (
    <div className={cn('flex items-center gap-2', className, isLoading ? 'pointer-events-none opacity-70' : '')}>
      <FacetedFormFilter
        type="text"
        size="small"
        title="Subscriber ID"
        value={subscriberIdValue}
        onChange={handleSubscriberIdChange}
        placeholder="Search by subscriber ID"
      />

      {subscriberId && (
        <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset} disabled={isLoading}>
          Reset
        </Button>
      )}
    </div>
  );
}
