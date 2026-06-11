import type { StreamPart } from '@novu/thalamus';

export interface Env {
  SESSION_OBSERVER: DurableObjectNamespace;
  API_KEY?: string;
}

export interface ObservationParams {
  sessionId: string;
  runId: string;
  turnId: string;
  streamUrl: string;
  headers: Record<string, string>;
  lastEventId?: string;
  provider: string;
  webhook: {
    url: string;
    secret: string;
    metadata?: Record<string, string>;
  };
}

export interface EnqueueParams {
  sessionId: string;
  runId: string;
  turnId: string;
  provider: string;
  request: {
    messages: unknown[];
    sessionId?: string;
    toolResults?: Array<{ toolUseId: string; [key: string]: unknown }>;
    vaultIds?: string[];
    providerOptions?: Record<string, unknown>;
    webhookMetadata?: Record<string, string>;
  };
  webhook: {
    url: string;
    secret: string;
    metadata?: Record<string, string>;
  };
}

export interface MessageQueueRow {
  id: number;
  session_id: string;
  run_id: string;
  turn_id: string;
  request_json: string;
  webhook_json: string;
  created_at: number;
  [key: string]: SqlStorageValue;
}

export interface EventRow {
  id: number;
  session_id: string;
  sequence: number;
  event_json: string;
  status: string;
  attempts: number;
  created_at: number;
  [key: string]: SqlStorageValue;
}

export type DeliveryOutcome = 'delivered' | 'skipped' | 'retry-later' | 'exhausted';

export type ObservationStatus = 'active' | 'completed' | 'error';

export type QueueState = 'idle' | 'active';

export interface State {
  observation: (ObservationParams & { status: ObservationStatus }) | null;
  queueState: QueueState;
}

export interface ProviderParser {
  createAccumulator(): import('./parsers').EdgeAccumulator;
  mapEvent(raw: unknown, acc: import('./parsers').EdgeAccumulator): Generator<StreamPart>;
}
