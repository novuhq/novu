import type { AgentRuntime } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { type GeneratedManagedAgent, generateManagedAgent } from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

/**
 * Thrown by {@link useGenerateManagedAgent}'s `generate` when the in-flight request was
 * aborted via `cancel()`. The api client converts the native `DOMException` AbortError into
 * a generic `Error("Fetch error: ...")`, so consumers must check this typed error to
 * silently ignore user-initiated cancellations.
 */
export class GenerationCancelledError extends Error {
  constructor() {
    super('Generation cancelled');
    this.name = 'GenerationCancelledError';
  }
}

type GenerateInput = {
  prompt: string;
  /**
   * `managed` (default) → full Claude tools/MCPs/skills payload from the catalog.
   * `self-hosted` → only name/identifier/systemPrompt; used by the Custom Scaffold flow.
   */
  runtime?: AgentRuntime;
};

export function useGenerateManagedAgent() {
  const { currentEnvironment } = useEnvironment();
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation<GeneratedManagedAgent, Error, GenerateInput>({
    mutationFn: async ({ prompt, runtime }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        return await generateManagedAgent({
          environment: requireEnvironment(currentEnvironment, 'No environment selected'),
          prompt,
          runtime,
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new GenerationCancelledError();
        }
        throw err;
      }
    },
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    mutation.reset();
  }, [mutation]);

  return {
    generate: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    cancel,
  };
}
