import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { areHexDigestsEqual } from '../../shared/helpers/timing-safe-equal';
import { HumanBackingAccounts } from '../services/human-backing-accounts.service';

export const HUMAN_DASHBOARD_SECRET_HEADER = 'x-human-dashboard-secret';

/**
 * Guards the private endpoints that only the Human dashboard's server calls. They exist only where
 * `HUMAN_DASHBOARD_API_SECRET` is set and the Clerk-backed enterprise auth is loaded (Novu Cloud);
 * everywhere else they answer 404.
 */
@Injectable()
export class HumanDashboardSecretGuard implements CanActivate {
  constructor(private readonly humanBackingAccounts: HumanBackingAccounts) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = process.env.HUMAN_DASHBOARD_API_SECRET;
    if (!expectedSecret || !this.humanBackingAccounts.isAvailable()) {
      throw new NotFoundException();
    }

    if (!carriesHumanDashboardSecret(context.switchToHttp().getRequest().headers)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}

/**
 * Whether a request carries the secret only the Human dashboard's server knows. The dashboard sends it next
 * to the account's key on its regular calls too, so the API can tell the operator's dashboard from a host
 * holding the same key.
 */
export function carriesHumanDashboardSecret(headers: Record<string, unknown> | undefined): boolean {
  const expectedSecret = process.env.HUMAN_DASHBOARD_API_SECRET;
  const providedSecret = headers?.[HUMAN_DASHBOARD_SECRET_HEADER];

  return (
    Boolean(expectedSecret) &&
    typeof providedSecret === 'string' &&
    areHexDigestsEqual(sha256(expectedSecret as string), sha256(providedSecret))
  );
}

/** Machine-readable code on the error a host gets for a change only the operator makes on the dashboard. */
export const DASHBOARD_ONLY = 'dashboard_only';

/**
 * Refuses a change only the operator makes, on the Human dashboard: who can reach the agent, pausing or
 * resuming it, and deleting it. Hosts hold the same key, so the key alone doesn't count.
 */
export function assertFromHumanDashboard(headers: Record<string, unknown> | undefined): void {
  if (!carriesHumanDashboardSecret(headers)) {
    throw new ForbiddenException({
      code: DASHBOARD_ONLY,
      message: 'Only the operator can change who can reach the agent, pause it or delete it, on agentinbox.md.',
    });
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
