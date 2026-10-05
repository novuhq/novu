import { createHash } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { areHexDigestsEqual } from '../../shared/helpers/timing-safe-equal';
import { HumanBackingAccounts } from '../services/human-backing-accounts.service';

export const HUMAN_WEBSITE_SECRET_HEADER = 'x-human-website-secret';

/**
 * Guards the private endpoints that only the Human website's server calls. They exist only where
 * `HUMAN_WEBSITE_API_SECRET` is set and the Clerk-backed enterprise auth is loaded (Novu Cloud);
 * everywhere else they answer 404.
 */
@Injectable()
export class HumanWebsiteSecretGuard implements CanActivate {
  constructor(private readonly humanBackingAccounts: HumanBackingAccounts) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = process.env.HUMAN_WEBSITE_API_SECRET;
    if (!expectedSecret || !this.humanBackingAccounts.isAvailable()) {
      throw new NotFoundException();
    }

    const providedSecret = context.switchToHttp().getRequest().headers?.[HUMAN_WEBSITE_SECRET_HEADER];
    if (typeof providedSecret !== 'string' || !areHexDigestsEqual(sha256(expectedSecret), sha256(providedSecret))) {
      throw new UnauthorizedException();
    }

    return true;
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
