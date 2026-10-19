import { HttpException } from '@nestjs/common';
import {
  AgentRuntimeBadRequestError,
  AgentRuntimeForbiddenError,
  AgentRuntimeNotFoundError,
  AgentRuntimeRateLimitedError,
  AgentRuntimeUnauthorizedError,
} from '@novu/application-generic';
import { captureException } from '@sentry/node';

export interface AgentSentryContext {
  component: string;
  operation?: string;
  agentId?: string;
  agentIdentifier?: string;
  integrationIdentifier?: string;
  platform?: string;
  sessionId?: string;
  extra?: Record<string, unknown>;
}

function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function shouldSkipCapture(err: unknown): boolean {
  if (err instanceof HttpException) {
    const status = err.getStatus();

    if (status >= 400 && status < 500) {
      return true;
    }
  }

  if (
    err instanceof AgentRuntimeUnauthorizedError ||
    err instanceof AgentRuntimeForbiddenError ||
    err instanceof AgentRuntimeBadRequestError ||
    err instanceof AgentRuntimeNotFoundError ||
    err instanceof AgentRuntimeRateLimitedError
  ) {
    return true;
  }

  return false;
}

function buildScope(context: AgentSentryContext, level: 'error' | 'warning') {
  return {
    level,
    tags: {
      feature: 'agents',
      component: context.component,
      ...(context.operation ? { operation: context.operation } : {}),
      ...(context.agentId ? { agentId: context.agentId } : {}),
      ...(context.agentIdentifier ? { agentIdentifier: context.agentIdentifier } : {}),
      ...(context.platform ? { platform: context.platform } : {}),
    },
    extra: {
      ...(context.integrationIdentifier ? { integrationIdentifier: context.integrationIdentifier } : {}),
      ...(context.sessionId ? { sessionId: context.sessionId } : {}),
      ...context.extra,
    },
  };
}

/** Report unexpected agent failures to Sentry (skipped when SENTRY_DSN is unset). */
export function captureAgentException(err: unknown, context: AgentSentryContext): void {
  if (!isSentryEnabled() || shouldSkipCapture(err)) {
    return;
  }

  captureException(toError(err), buildScope(context, 'error'));
}

/** Report degraded-but-handled agent paths to Sentry at warning level. */
export function captureAgentWarning(err: unknown, context: AgentSentryContext): void {
  if (!isSentryEnabled() || shouldSkipCapture(err)) {
    return;
  }

  captureException(toError(err), buildScope(context, 'warning'));
}
