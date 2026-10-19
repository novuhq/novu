import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FeatureFlagsService,
  PinoLogger,
  SubscriberResponseDto,
  UpdateSubscriber,
  UpdateSubscriberCommand,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  OrganizationEntity,
  SubscriberRepository,
  UserEntity,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { subscriberIdSchema } from '../../../events/utils/trigger-recipient-validation';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { PatchSubscriberCommand } from './patch-subscriber.command';

@Injectable()
export class PatchSubscriber {
  constructor(
    private updateSubscriberUseCase: UpdateSubscriber,
    private subscriberRepository: SubscriberRepository,
    private featureFlagService: FeatureFlagsService,
    private environmentRepository: EnvironmentRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: PatchSubscriberCommand): Promise<SubscriberResponseDto> {
    const dto = command.patchSubscriberRequestDto;
    const [environment, organization, existingSubscriber] = await Promise.all([
      this.environmentRepository.findOne({ _id: command.environmentId }, '_id', {
        readPreference: 'secondaryPreferred',
      }),
      this.communityOrganizationRepository.findOne({ _id: command.organizationId }, '_id', {
        readPreference: 'secondaryPreferred',
      }),
      this.subscriberRepository.findOne({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      }),
    ]);

    if (!organization) {
      throw new BadRequestException(`Organization ${command.organizationId} was not found`);
    }

    if (!environment) {
      throw new BadRequestException(`Environment ${command.environmentId} was not found`);
    }

    if (!existingSubscriber) {
      throw new NotFoundException(`Subscriber ${command.subscriberId} was not found`);
    }

    await this.validateItem({
      itemId: command.subscriberId,
      environment,
      organization,
      userId: command.userId,
    });

    const updatedSubscriber = await this.updateSubscriberUseCase.execute(
      UpdateSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        avatar: dto.avatar,
        locale: dto.locale,
        timezone: dto.timezone,
        data: dto.data,
        subscriber: existingSubscriber,
      })
    );

    return mapSubscriberEntityToDto(updatedSubscriber);
  }

  private async validateItem({
    itemId,
    userId,
    environment,
    organization,
  }: {
    itemId: string;
    environment?: Pick<EnvironmentEntity, '_id'>;
    organization?: Pick<OrganizationEntity, '_id'>;
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
