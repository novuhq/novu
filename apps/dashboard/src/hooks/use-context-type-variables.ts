import { useMemo } from 'react';
import type { EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { buildContextTypeVariables } from '@/utils/context-type-variables';

export function useContextTypeVariables(): EnhancedConditionVariable[] {
  const { data: contextsData } = useFetchContexts({ limit: 50 }, { staleTime: 30_000 });

  return useMemo(() => buildContextTypeVariables(contextsData?.data ?? []), [contextsData]);
}
