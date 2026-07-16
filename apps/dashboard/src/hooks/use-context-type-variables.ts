import { useMemo } from 'react';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { LiquidVariable } from '@/utils/parseStepVariables';

/**
 * Fetches available context entities from the API and returns synthetic
 * variables for each distinct context type. This enables the autocomplete
 * to show known context types (e.g. context.tenant.id, context.tenant.data)
 * even when no context data has been added to the preview sandbox yet.
 */
export function useContextTypeVariables(): LiquidVariable[] {
  const { data: contextsData } = useFetchContexts({ limit: 50 }, { staleTime: 30_000 });

  return useMemo(() => {
    const contexts = contextsData?.data;
    if (!contexts || contexts.length === 0) return [];

    const types = new Set<string>();
    for (const ctx of contexts) {
      if (ctx.type) {
        types.add(ctx.type);
      }
    }

    const variables: LiquidVariable[] = [];
    for (const type of types) {
      variables.push({ name: `context.${type}` });
      variables.push({ name: `context.${type}.id` });
      variables.push({ name: `context.${type}.data` });
    }

    return variables;
  }, [contextsData]);
}
