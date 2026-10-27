import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, type UserSessionData } from '@novu/shared';
import { agentPausedError } from '../../agents/human-relay/agent-paused.error';
import { carriesHumanDashboardSecret } from './human-dashboard-secret.guard';

export { AGENT_PAUSED } from '../../agents/human-relay/agent-paused.error';

/** The credentials an agent's hosts call with. A person signed in to Novu (`Bearer`) is never a host. */
const HOST_SCHEMES: readonly string[] = [ApiAuthSchemeEnum.API_KEY, ApiAuthSchemeEnum.KEYLESS];

type HostRequest = {
  user?: UserSessionData;
  headers?: Record<string, unknown>;
};

/**
 * Keeps a paused agent's hosts out of its inbox: they can't read conversations or send until the operator
 * resumes it on the dashboard, while messages keep arriving. Every call with the account's key counts as a
 * host's, the CLI's, MCP's or anyone else's, except the operator's own dashboard, which proves itself with
 * its secret.
 *
 * It doesn't go by the agent a call names: some endpoints ignore that name, or read it from somewhere else,
 * so a host could name another agent to get past. An account has one relay agent in practice, so while any
 * relay agent of the environment is paused, its hosts get nothing from these endpoints.
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

    const paused = await this.agentRepository.findOne(
      {
        _environmentId: user.environmentId,
        _organizationId: user.organizationId,
        runtime: 'human_relay',
        pausedAt: { $exists: true, $ne: null },
      },
      ['pausedAt']
    );

    if (paused?.pausedAt) {
      throw agentPausedError(paused.pausedAt);
    }

    return true;
  }
}

/** A call made with the agent's key, by anyone but the operator's dashboard. */
function isHostRequest(request: HostRequest): boolean {
  return HOST_SCHEMES.includes(request.user?.scheme ?? '') && !carriesHumanDashboardSecret(request.headers);
}
