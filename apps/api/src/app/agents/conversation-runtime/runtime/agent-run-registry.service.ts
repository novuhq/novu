import { Injectable } from '@nestjs/common';

type ActiveRunEntry = {
  abortController: AbortController;
  runId?: string;
  source: 'bridge' | 'managed';
};

/**
 * In-process registry of active agent runs keyed by Mongo conversation id.
 * Used to propagate server-side cancel as an AbortSignal to managed providers
 * and to correlate run-start envelopes with in-flight dispatches.
 */
@Injectable()
export class AgentRunRegistryService {
  private readonly runs = new Map<string, ActiveRunEntry>();

  register(conversationId: string, source: 'bridge' | 'managed'): AbortSignal {
    const existing = this.runs.get(conversationId);
    if (existing) {
      existing.abortController.abort();
    }

    const abortController = new AbortController();
    this.runs.set(conversationId, { abortController, source });

    return abortController.signal;
  }

  setRunId(conversationId: string, runId: string): void {
    const entry = this.runs.get(conversationId);
    if (entry) {
      entry.runId = runId;
    }
  }

  getRunId(conversationId: string): string | undefined {
    return this.runs.get(conversationId)?.runId;
  }

  getSource(conversationId: string): 'bridge' | 'managed' | undefined {
    return this.runs.get(conversationId)?.source;
  }

  abort(conversationId: string): boolean {
    const entry = this.runs.get(conversationId);
    if (!entry) {
      return false;
    }

    entry.abortController.abort();

    return true;
  }

  unregister(conversationId: string): void {
    this.runs.delete(conversationId);
  }
}
