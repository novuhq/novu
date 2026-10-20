import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AnalyticsService, CacheService } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { EnvironmentTypeEnum } from '@novu/shared';
import { SyncExternalOrganizationCommand } from '../../../organization/usecases/create-organization/sync-external-organization/sync-external-organization.command';
import { resolveHumanRegion } from '../../../shared/helpers/resolve-human-dashboard-base-url';
import type { HumanAccountResponseDto } from '../../dtos/human-account.dto';
import { trackAgentInboxSignedUp } from '../../services/agent-inbox-analytics';
import {
  buildHumanBackingEmail,
  HumanBackingAccount,
  HumanBackingAccounts,
} from '../../services/human-backing-accounts.service';
import { EnsureBackingOrganizationCommand } from './ensure-backing-organization.command';

const LOCK_KEY_PREFIX = 'human_backing_account_lock:';
const LOCK_TTL_SECONDS = 60;
/** How often a request that waits for the lock looks again. It sets how soon the wait ends, never whether it does. */
const LOCK_CHECK_MS = 200;
/** Past the lock's own expiry, so a lock whose request died has been dropped by Redis before the wait gives up. */
const LOCK_GRACE_MS = 5000;
/** How long a request waits for the lock at most: the lock's own expiry and the grace above. */
export const LOCK_WAIT_MS = LOCK_TTL_SECONDS * 1000 + LOCK_GRACE_MS;

/**
 * Lets go of a lock only while it is still this request's. A lock that ran out and was taken by another
 * request since is that request's to let go of. KEYS: the lock. ARGV: this request's token.
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end
return 0
`;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accountBusy(): ConflictException {
  return new ConflictException({
    message: 'This Human account is being set up. Please try again in a moment.',
    code: 'human_account_busy',
  });
}

function pickDevelopmentEnvironment(environments: EnvironmentEntity[]): EnvironmentEntity | undefined {
  return environments.find((env) => env.type === EnvironmentTypeEnum.DEV && !env._parentId);
}

export function findBackingDevelopmentEnvironment(environments: EnvironmentEntity[]): EnvironmentEntity {
  const development = pickDevelopmentEnvironment(environments);
  if (!development) {
    throw new NotFoundException('The Development environment of this Human account was not found.');
  }

  return development;
}

/**
 * Makes sure a Human account has its backing organization: the hidden Clerk user and organization,
 * then Novu's normal organization setup (environments, integrations, API keys). Safe to call on every visit.
 */
@Injectable()
export class EnsureBackingOrganization {
  constructor(
    private readonly humanBackingAccounts: HumanBackingAccounts,
    private readonly communityOrganizationRepository: CommunityOrganizationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly cacheService: CacheService,
    private readonly moduleRef: ModuleRef,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: EnsureBackingOrganizationCommand): Promise<HumanAccountResponseDto> {
    const lockKey = `${LOCK_KEY_PREFIX}{${command.humanUserId}}`;
    const lockToken = await this.waitForLock(lockKey);

    try {
      const account = await this.humanBackingAccounts.findOrCreate({
        humanUserId: command.humanUserId,
        firstName: command.firstName,
        lastName: command.lastName,
      });
      const { organizationId, environmentId } = await this.ensureNovuOrganization(command.humanUserId, account);

      return { organizationId, userId: account.novuUserId, environmentId, region: resolveHumanRegion() };
    } finally {
      if (lockToken) {
        await this.releaseLock(lockKey, lockToken);
      }
    }
  }

  /**
   * One request at a time sets an account up. The sign-up webhook and the operator's first page arrive
   * together, and the setup takes several seconds, so whichever comes second waits here for its turn instead
   * of failing. By then the account is ready, and its turn only finds it and returns it.
   *
   * The wait ends with the setup it waits for, not after a set time: the lock is let go when that setup is
   * done or fails, or Redis drops it after LOCK_TTL_SECONDS if its request died. Still not getting it once
   * that much time has gone by (LOCK_WAIT_MS) means the cache isn't answering, so the request says "busy"
   * instead of waiting forever, also when a call to the cache itself hangs.
   * Without a cache we skip the lock; Clerk's unique email and slug still prevent duplicates there.
   *
   * The lock holds a token of this request's own (returned, or null without a cache), so it is only ever let
   * go of by the request that holds it.
   */
  private async waitForLock(lockKey: string): Promise<string | null> {
    if (!this.cacheService.cacheEnabled()) {
      return null;
    }

    const token = randomUUID();
    const giveUpAt = Date.now() + LOCK_WAIT_MS;

    for (;;) {
      const left = giveUpAt - Date.now();
      if (left <= 0) {
        throw accountBusy();
      }

      if (await this.tryLock(lockKey, token, left)) {
        return token;
      }

      await pause(Math.min(LOCK_CHECK_MS, Math.max(0, giveUpAt - Date.now())));
    }
  }

  /**
   * One try at the lock that waits no longer than `withinMs` for the cache to answer: a connection that drops
   * mid-call can keep a call pending forever. A lock that call still takes after the request stopped waiting
   * is given back at once, so it doesn't block the account until it runs out; by its token, so a lock another
   * request took meanwhile stays.
   */
  private tryLock(lockKey: string, token: string, withinMs: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let gaveUp = false;
      const timer = setTimeout(() => {
        gaveUp = true;
        resolve(false);
      }, withinMs);

      this.cacheService.setIfNotExist(lockKey, token, { ttl: LOCK_TTL_SECONDS }).then(
        (result) => {
          if (gaveUp) {
            if (result === 'OK') {
              this.releaseLock(lockKey, token).catch(() => undefined);
            }

            return;
          }

          clearTimeout(timer);
          resolve(result === 'OK');
        },
        (error) => {
          if (!gaveUp) {
            clearTimeout(timer);
            reject(error);
          }
        }
      );
    });
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    await this.cacheService.eval(RELEASE_LOCK_SCRIPT, [lockKey], [token]);
  }

  private async ensureNovuOrganization(
    humanUserId: string,
    account: HumanBackingAccount
  ): Promise<{ organizationId: string; environmentId: string }> {
    const existing = await this.communityOrganizationRepository.findOne(
      { externalId: account.clerkOrganizationId },
      '_id'
    );
    if (existing) {
      const development = pickDevelopmentEnvironment(
        await this.environmentRepository.findOrganizationEnvironments(existing._id)
      );
      if (development) {
        return { organizationId: existing._id, environmentId: development._id };
      }

      // An earlier setup stopped before creating the environments. Nothing else hangs off the organization
      // record at that point, so drop it and run the setup again; it re-links the Clerk organization.
      await this.communityOrganizationRepository.delete({ _id: existing._id });
    }

    const syncExternalOrganization = await this.moduleRef.resolve('SyncOrganizationUsecase', undefined, {
      strict: false,
    });
    const organization = await syncExternalOrganization.execute(
      SyncExternalOrganizationCommand.create({
        userId: account.novuUserId,
        externalId: account.clerkOrganizationId,
        email: buildHumanBackingEmail(humanUserId),
        headers: {},
      })
    );
    const development = findBackingDevelopmentEnvironment(
      await this.environmentRepository.findOrganizationEnvironments(organization._id)
    );

    // Only a setup that made the organization gets this far, so each account signs up once.
    trackAgentInboxSignedUp(this.analyticsService, { userId: account.novuUserId, organizationId: organization._id });

    return { organizationId: organization._id, environmentId: development._id };
  }
}
