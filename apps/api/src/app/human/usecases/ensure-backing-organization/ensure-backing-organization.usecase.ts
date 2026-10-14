import { setTimeout as delay } from 'node:timers/promises';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CacheService } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { EnvironmentTypeEnum } from '@novu/shared';
import { SyncExternalOrganizationCommand } from '../../../organization/usecases/create-organization/sync-external-organization/sync-external-organization.command';
import { resolveHumanRegion } from '../../../shared/helpers/resolve-human-dashboard-base-url';
import type { HumanAccountResponseDto } from '../../dtos/human-account.dto';
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
    private readonly moduleRef: ModuleRef
  ) {}

  async execute(command: EnsureBackingOrganizationCommand): Promise<HumanAccountResponseDto> {
    const lockKey = `${LOCK_KEY_PREFIX}{${command.humanUserId}}`;
    const locked = await this.waitForLock(lockKey);

    try {
      const account = await this.humanBackingAccounts.findOrCreate({
        humanUserId: command.humanUserId,
        firstName: command.firstName,
        lastName: command.lastName,
      });
      const { organizationId, environmentId } = await this.ensureNovuOrganization(command.humanUserId, account);

      return { organizationId, userId: account.novuUserId, environmentId, region: resolveHumanRegion() };
    } finally {
      if (locked) {
        await this.cacheService.del(lockKey);
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
   * that much time has gone by means the cache isn't answering, so the request says "busy" instead of waiting forever.
   * Without a cache we skip the lock; Clerk's unique email and slug still prevent duplicates there.
   */
  private async waitForLock(lockKey: string): Promise<boolean> {
    if (!this.cacheService.cacheEnabled()) {
      return false;
    }

    const giveUpAt = Date.now() + LOCK_TTL_SECONDS * 1000 + LOCK_GRACE_MS;
    while ((await this.cacheService.setIfNotExist(lockKey, '1', { ttl: LOCK_TTL_SECONDS })) !== 'OK') {
      if (Date.now() >= giveUpAt) {
        throw new ConflictException({
          message: 'This Human account is being set up. Please try again in a moment.',
          code: 'human_account_busy',
        });
      }

      await delay(LOCK_CHECK_MS);
    }

    return true;
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

    return { organizationId: organization._id, environmentId: development._id };
  }
}
