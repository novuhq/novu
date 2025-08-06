import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository, EnvironmentEntity, EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { GetEnvironmentTagsDto } from '../../dtos/get-environment-tags.dto';
import { GetEnvironmentTagsCommand } from './get-environment-tags.command';

@Injectable()
export class GetEnvironmentTags {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  async execute(command: GetEnvironmentTagsCommand): Promise<GetEnvironmentTagsDto[]> {
    const environment = await this.resolveEnvironment(command);

    if (!environment) {
      throw new NotFoundException(`Environment ${command.environmentIdOrIdentifier} not found`);
    }

    const notificationTemplates = await this.notificationTemplateRepository.find({
      _environmentId: environment._id,
      tags: { $exists: true, $type: 'array', $ne: [] },
    });

    const tags = notificationTemplates.flatMap((template) => template.tags);
    const uniqueTags = Array.from(new Set(tags));

    return this.sanitizeTags(uniqueTags);
  }

  private async resolveEnvironment(command: GetEnvironmentTagsCommand): Promise<EnvironmentEntity | null> {
    const isInternalId = BaseRepository.isInternalId(command.environmentIdOrIdentifier);

    if (isInternalId) {
      return await this.environmentRepository.findOne(
        {
          _id: command.environmentIdOrIdentifier,
          _organizationId: command.organizationId,
        },
        '-apiKeys'
      );
    } else {
      const environment = await this.environmentRepository.findEnvironmentByIdentifier(
        command.environmentIdOrIdentifier
      );

      if (environment && environment._organizationId === command.organizationId) {
        return environment;
      }

      return null;
    }
  }

  private sanitizeTags(tags: string[]): GetEnvironmentTagsDto[] {
    return tags.filter((tag) => tag != null && tag !== '').map((tag) => ({ name: tag }));
  }
}
