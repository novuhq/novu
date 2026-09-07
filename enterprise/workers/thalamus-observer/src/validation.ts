import { providers } from './parsers';
import type { EnqueueParams, ObservationParams } from './types';

export function validateEnqueueParams(body: unknown): body is EnqueueParams {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.sessionId !== 'string' || obj.sessionId.length === 0) return false;
  if (typeof obj.runId !== 'string' || obj.runId.length === 0) return false;
  if (typeof obj.turnId !== 'string' || obj.turnId.length === 0) return false;
  if (typeof obj.provider !== 'string' || !providers[obj.provider]) return false;
  if (typeof obj.request !== 'object' || obj.request === null) return false;
  if (typeof obj.webhook !== 'object' || obj.webhook === null) return false;
  const webhook = obj.webhook as Record<string, unknown>;
  if (typeof webhook.url !== 'string') return false;
  if (typeof webhook.secret !== 'string' || webhook.secret.length === 0) return false;

  return true;
}

export function validateObservationParams(body: unknown): body is ObservationParams {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.sessionId !== 'string' || obj.sessionId.length === 0) return false;
  if (typeof obj.runId !== 'string' || obj.runId.length === 0) return false;
  if (typeof obj.turnId !== 'string' || obj.turnId.length === 0) return false;
  if (typeof obj.streamUrl !== 'string') return false;
  try {
    new URL(obj.streamUrl);
  } catch {
    return false;
  }
  if (typeof obj.headers !== 'object' || obj.headers === null || Array.isArray(obj.headers)) return false;
  const headers = obj.headers as Record<string, unknown>;
  for (const val of Object.values(headers)) {
    if (typeof val !== 'string') return false;
  }
  if (typeof obj.provider !== 'string' || !providers[obj.provider]) return false;
  if (typeof obj.webhook !== 'object' || obj.webhook === null) return false;
  const webhook = obj.webhook as Record<string, unknown>;
  if (typeof webhook.url !== 'string') return false;
  try {
    new URL(webhook.url);
  } catch {
    return false;
  }
  if (typeof webhook.secret !== 'string' || webhook.secret.length === 0) return false;

  return true;
}
