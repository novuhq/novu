import { useMemo } from 'react';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { LiquidVariable } from '@/utils/parseStepVariables';

const MAX_CONTEXT_DATA_DEPTH = 5;

function collectDataPaths(obj: Record<string, unknown>, prefix: string, depth = 0): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    paths.push(path);
    if (depth < MAX_CONTEXT_DATA_DEPTH && value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...collectDataPaths(value as Record<string, unknown>, path, depth + 1));
    }
  }

  return paths;
}

/**
 * Fetches available context entities from the API and returns synthetic
 * variables for each distinct context type, including data sub-properties.
 * This enables the autocomplete to show known context types and their data
 * fields (e.g. context.tenant.data.companyName) even before the user has
 * added context data to the preview sandbox.
 */
export function useContextTypeVariables(): LiquidVariable[] {
  const { data: contextsData } = useFetchContexts({ limit: 50 }, { staleTime: 30_000 });

  return useMemo(() => {
    const contexts = contextsData?.data;
    if (!contexts || contexts.length === 0) return [];

    const seenNames = new Set<string>();
    const variables: LiquidVariable[] = [];

    const add = (name: string) => {
      if (seenNames.has(name)) return;
      seenNames.add(name);
      variables.push({ name });
    };

    for (const ctx of contexts) {
      if (!ctx.type) continue;

      // `context.<type>` alone is not a valid variable — only `.id` and `.data.*` are.
      add(`context.${ctx.type}.id`);
      add(`context.${ctx.type}.data`);

      if (ctx.data && typeof ctx.data === 'object' && Object.keys(ctx.data).length > 0) {
        const dataPaths = collectDataPaths(ctx.data as Record<string, unknown>, `context.${ctx.type}.data`);
        for (const path of dataPaths) {
          add(path);
        }
      }
    }

    return variables;
  }, [contextsData]);
}
