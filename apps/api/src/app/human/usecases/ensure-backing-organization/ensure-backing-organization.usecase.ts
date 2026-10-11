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
    const locked = await this.acquireLock(lockKey);

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
   * Two tabs finishing sign-up at once would otherwise both run the organization setup.
   * Without a cache we skip the lock; Clerk's unique email and slug still prevent duplicates there.
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    if (!this.cacheService.cacheEnabled()) {
      return false;
    }

    const acquired = await this.cacheService.setIfNotExist(lockKey, '1', { ttl: LOCK_TTL_SECONDS });
    if (acquired !== 'OK') {
      throw new ConflictException({
        message: 'This Human account is being set up. Please try again in a moment.',
        code: 'human_account_busy',
      });
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
