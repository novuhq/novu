import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, type UserSessionData } from '@novu/shared';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../usecases/setup-human-relay/setup-human-relay.usecase';
import { carriesHumanDashboardSecret } from './human-dashboard-secret.guard';

/** Machine-readable code on the error a paused agent's host gets, so the CLI and MCP can tell it apart. */
export const AGENT_PAUSED = 'agent_paused';

/** The credentials an agent's hosts call with. A person signed in to Novu (`Bearer`) is never a host. */
const HOST_SCHEMES: readonly string[] = [ApiAuthSchemeEnum.API_KEY, ApiAuthSchemeEnum.KEYLESS];

/** Same shape `HumanAgentQueryDto` accepts; anything else is left for the endpoint's own validation. */
const AGENT_IDENTIFIER_PATTERN = /^[a-z0-9-_]{1,64}$/i;

type HostRequest = {
  user?: UserSessionData;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
};

/**
 * Keeps a paused agent's hosts out of its inbox: they can't read conversations or send until the operator
 * resumes it on the dashboard, while messages keep arriving. Every call with the account's key counts as a host's, the
 * CLI's, MCP's or anyone else's, except the operator's own dashboard, which proves itself with its secret.
 *
 * Goes on the inbox and interaction endpoints, after authentication.
 */
@Injectable()
export class HumanAgentPausedGuard implements CanActivate {
  constructor(private readonly agentRepository: AgentRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HostRequest>();
    const { user } = request;

    if (!user?.environmentId || !isHostRequest(request)) {
      return true;
    }

    const identifier = readAgentIdentifier(request);
    if (!identifier) {
      return true;
    }

    const agent = await this.agentRepository.findOne(
      { identifier, _environmentId: user.environmentId, _organizationId: user.organizationId },
      ['runtime', 'pausedAt']
    );

    if (agent?.runtime === 'human_relay' && agent.pausedAt) {
      throw agentPausedError(agent.pausedAt);
    }

    return true;
  }
}

/** A call made with the agent's key, by anyone but the operator's dashboard. */
function isHostRequest(request: HostRequest): boolean {
  return HOST_SCHEMES.includes(request.user?.scheme ?? '') && !carriesHumanDashboardSecret(request.headers);
}

/** The relay agent the call names in its query or body, or the default one. Null for a malformed name. */
function readAgentIdentifier(request: HostRequest): string | null {
  const body =
    typeof request.body === 'object' && request.body !== null ? (request.body as Record<string, unknown>) : {};
  const named = request.query?.agentIdentifier ?? body.agentIdentifier;

  if (named === undefined || named === null || named === '') {
    return DEFAULT_HUMAN_RELAY_IDENTIFIER;
  }

  return typeof named === 'string' && AGENT_IDENTIFIER_PATTERN.test(named) ? named : null;
}

function agentPausedError(pausedAt: string): ForbiddenException {
  return new ForbiddenException({
    code: AGENT_PAUSED,
    message:
      'This agent is paused: it can’t read its inbox or send until its operator resumes it on agentinbox.md. Messages people send meanwhile wait in the inbox.',
    pausedAt,
  });
}
