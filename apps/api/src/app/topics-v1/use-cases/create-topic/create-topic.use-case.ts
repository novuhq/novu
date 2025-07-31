import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  OrganizationEntity,
  TopicEntity,
  TopicRepository,
  UserEntity,
} from '@novu/dal';
import { FeatureFlagsKeysEnum, VALID_ID_REGEX } from '@novu/shared';
import { TopicDto } from '../../dtos/topic.dto';
import { CreateTopicCommand } from './create-topic.command';

@Injectable()
export class CreateTopicUseCase {
  constructor(
    private topicRepository: TopicRepository,
    private featureFlagService: FeatureFlagsService,
    private environmentRepository: EnvironmentRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CreateTopicCommand) {
    const entity = this.mapToEntity(command);

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

    const topicExists = await this.topicRepository.findTopicByKey(
      entity.key,
      entity._organizationId,
      entity._environmentId
    );

    if (topicExists) {
      throw new ConflictException(
        `Topic exists with key ${entity.key} in the environment ${entity._environmentId} of the organization ${entity._organizationId}`
      );
    }

    await this.validateTopicKey({
      environment,
      organization,
      userId: command.userId,
      key: entity.key,
    });

    const topic = await this.topicRepository.createTopic(entity);

    return this.mapFromEntity(topic);
  }

  private mapToEntity(domainEntity: CreateTopicCommand): Omit<TopicEntity, '_id'> {
    return {
      _environmentId: domainEntity.environmentId,
      _organizationId: domainEntity.organizationId,
      key: domainEntity.key,
      name: domainEntity.name,
    };
  }

  private mapFromEntity(topic: TopicEntity): TopicDto {
    return {
      ...topic,
      _id: topic._id,
      _organizationId: topic._organizationId,
      _environmentId: topic._environmentId,
      subscribers: [],
    };
  }

  private isValidTopicKey(key: string): boolean {
    return key.length > 0 && key.match(VALID_ID_REGEX) !== null;
  }

  private async validateTopicKey({
    key,
    userId,
    environment,
    organization,
  }: {
    key: string;
    environment?: EnvironmentEntity;
    organization?: OrganizationEntity;
    userId: string;
  }): Promise<void> {
    const isDryRun = await this.featureFlagService.getFlag({
      environment,
      organization,
      user: { _id: userId } as UserEntity,
      key: FeatureFlagsKeysEnum.IS_TOPIC_KEYS_VALIDATION_DRY_RUN_ENABLED,
      defaultValue: true,
    });

    if (this.isValidTopicKey(key)) {
      return;
    }

    if (isDryRun) {
      this.logger.warn(`[Dry run] Invalid topic key: ${key}`);
    } else {
      throw new BadRequestException(
        `Invalid topic key: "${key}". Topic keys must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address.`
      );
    }
  }
}
