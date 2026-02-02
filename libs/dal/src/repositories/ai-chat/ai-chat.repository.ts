import { AiResourceTypeEnum } from '@novu/shared';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { AiChatDBModel, AiChatEntity } from './ai-chat.entity';
import { AiChat } from './ai-chat.schema';

export class AiChatRepository extends BaseRepository<AiChatDBModel, AiChatEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(AiChat, AiChatEntity);
  }

  async findLatestByResource(
    environmentId: string,
    organizationId: string,
    userId: string,
    resourceType: AiResourceTypeEnum,
    resourceId: string
  ): Promise<AiChatEntity | null> {
    const results = await this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _userId: userId,
        resourceType,
        resourceId,
      },
      undefined,
      { sort: { updatedAt: -1 }, limit: 1 }
    );

    return results[0] || null;
  }
}
