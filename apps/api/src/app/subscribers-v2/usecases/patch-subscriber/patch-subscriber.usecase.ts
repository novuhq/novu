import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  OrganizationEntity,
  SubscriberEntity,
  SubscriberRepository,
  UserEntity,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { subscriberIdSchema } from '../../../events/utils/trigger-recipient-validation';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { PatchSubscriberCommand } from './patch-subscriber.command';

@Injectable()
export class PatchSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private featureFlagService: FeatureFlagsService,
    private environmentRepository: EnvironmentRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: PatchSubscriberCommand): Promise<SubscriberResponseDto> {
    const nonUndefinedEntries = Object.entries(command.patchSubscriberRequestDto).filter(
      ([_key, value]) => value !== undefined
    );
    const payload: Partial<SubscriberEntity> = Object.fromEntries(nonUndefinedEntries);

    const [environment, organization] = await Promise.all([
      this.environmentRepository.findOne({ _id: command.environmentId }),
      this.communityOrganizationRepository.findOne({ _id: command.organizationId }),
    ]);

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    await this.validateItem({
      itemId: command.subscriberId,
      environment,
      organization,
      userId: command.userId,
    });

    const updatedSubscriber = await this.subscriberRepository.findOneAndUpdate(
      {
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { ...payload },
      {
        new: true,
        projection: {
          _environmentId: 1,
          _id: 1,
          _organizationId: 1,
          avatar: 1,
          data: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          locale: 1,
          phone: 1,
          subscriberId: 1,
          timezone: 1,
          createdAt: 1,
          updatedAt: 1,
          deleted: 1,
        },
      }
    );

    if (!updatedSubscriber) {
      throw new NotFoundException(`Subscriber: ${command.subscriberId} was not found`);
    }

    return mapSubscriberEntityToDto(updatedSubscriber);
  }

  private async validateItem({
    itemId,
    userId,
    environment,
    organization,
  }: {
    itemId: string;
    environment?: EnvironmentEntity;
    organization?: OrganizationEntity;
    userId: string;
  }) {
    const isDryRun = await this.featureFlagService.getFlag({
      environment,
      organization,
      user: { _id: userId } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_ID_VALIDATION_DRY_RUN_ENABLED,
      defaultValue: true,
    });
    const result = subscriberIdSchema.safeParse(itemId);

    if (result.success) {
      return;
    }

    if (isDryRun) {
      this.logger.warn(`[Dry run] Invalid recipients: ${itemId}`);
    } else {
      throw new BadRequestException(
        `Invalid subscriberId: ${itemId}, only alphanumeric characters, -, _, and . or valid email addresses are allowed`
      );
    }
  }
}
