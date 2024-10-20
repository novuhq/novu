import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { GetEnvironmentTagsCommand } from './get-environment-tags.command';
import { GetEnvironmentTagsDto } from '../../dtos/get-environment-tags.dto';

@Injectable()
export class GetEnvironmentTags {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  async execute(command: GetEnvironmentTagsCommand): Promise<GetEnvironmentTagsDto[]> {
    const environment: Omit<EnvironmentEntity, 'apiKeys'> | null = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      '-apiKeys'
    );

    if (!environment) throw new NotFoundException(`Environment ${command.environmentId} not found`);

    const notificationTemplates = await this.notificationTemplateRepository.find({
      _environmentId: command.environmentId,
      tags: { $exists: true, $type: 'array', $ne: [] },
    });

    const tags = notificationTemplates.flatMap((template) => template.tags);
    const uniqueTags = Array.from(new Set(tags));

    return this.sanitizeTags(uniqueTags);
  }

  private sanitizeTags(tags: string[]): GetEnvironmentTagsDto[] {
    return tags.filter((tag) => tag != null && tag !== '').map((tag) => ({ name: tag }));
  }
}
