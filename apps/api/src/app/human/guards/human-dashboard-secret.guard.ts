import { createHash } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

    const providedSecret = context.switchToHttp().getRequest().headers?.[HUMAN_DASHBOARD_SECRET_HEADER];
    if (typeof providedSecret !== 'string' || !areHexDigestsEqual(sha256(expectedSecret), sha256(providedSecret))) {
      throw new UnauthorizedException();
    }

    return true;
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
