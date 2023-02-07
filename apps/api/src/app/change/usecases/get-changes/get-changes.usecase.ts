import { Injectable, Logger } from '@nestjs/common';
import {
  ChangeEntity,
  ChangeRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationTemplateRepository,
  FeedRepository,
  LayoutRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { ChangesResponseDto } from '../../dtos/change-response.dto';
import { GetChangesCommand } from './get-changes.command';

interface IViewEntity {
  templateName: string;
  templateId?: string;
  messageType?: string;
}

interface IChangeViewEntity extends ChangeEntity {
  templateName?: string;
  templateId?: string;
  messageType?: string;
}

@Injectable()
export class GetChanges {
  constructor(
    private changeRepository: ChangeRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private feedRepository: FeedRepository,
    private layoutRepository: LayoutRepository
  ) {}

  async execute(command: GetChangesCommand): Promise<ChangesResponseDto> {
    const { data: changeItems, totalCount } = await this.changeRepository.getList(
      command.organizationId,
      command.environmentId,
      command.promoted,
      command.page * command.limit,
      command.limit
    );

    const changes = await changeItems.reduce(async (prev, change) => {
      const list: any[] = await prev;
      let item: Record<string, unknown> | IViewEntity = {};
      if (change.type === ChangeEntityTypeEnum.MESSAGE_TEMPLATE) {
        item = await this.getTemplateDataForMessageTemplate(change._entityId, command.environmentId);
      }
      if (change.type === ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE) {
        item = await this.getTemplateDataForNotificationTemplate(change._entityId, command.environmentId);
      }
      if (change.type === ChangeEntityTypeEnum.NOTIFICATION_GROUP) {
        item = await this.getTemplateDataForNotificationGroup(change._entityId, command.environmentId);
      }
      if (change.type === ChangeEntityTypeEnum.FEED) {
        item = await this.getTemplateDataForFeed(change._entityId, command.environmentId);
      }
      if (change.type === ChangeEntityTypeEnum.LAYOUT) {
        item = await this.getTemplateDataForLayout(change._entityId, command.environmentId);
      }
      if (change.type === ChangeEntityTypeEnum.DEFAULT_LAYOUT) {
        item = await this.getTemplateDataForLayout(change._entityId, command.environmentId);
      }

      list.push({
        ...change,
        ...item,
      });

      return list;
    }, Promise.resolve([]));

    return { data: changes, totalCount: totalCount, page: command.page, pageSize: command.limit };
  }

  private async getTemplateDataForMessageTemplate(
    entityId: string,
    environmentId: string
  ): Promise<IViewEntity | Record<string, unknown>> {
    const item = await this.notificationTemplateRepository.findOne({
      _environmentId: environmentId,
      'steps._templateId': entityId,
    });

    if (!item) {
      Logger.error(`Could not find notification template for message template id ${entityId}`);

      return {};
    }

    const message = await this.messageTemplateRepository.findOne({
      _environmentId: environmentId,
      _id: entityId,
    });

    return {
      templateId: item._id,
      templateName: item.name,
      messageType: message?.type,
    };
  }

  private async getTemplateDataForNotificationTemplate(
    entityId: string,
    environmentId: string
  ): Promise<IViewEntity | Record<string, unknown>> {
    let item = await this.notificationTemplateRepository.findOne({
      _environmentId: environmentId,
      _id: entityId,
    });

    if (!item) {
      const items = await this.notificationTemplateRepository.findDeleted({
        _id: entityId,
        _environmentId: environmentId,
      });
      item = items[0];
    }

    if (!item) {
      Logger.error(`Could not find notification template for template id ${entityId}`);

      return {};
    }

    return {
      templateId: item._id,
      templateName: item.name,
    };
  }

  private async getTemplateDataForNotificationGroup(
    entityId: string,
    environmentId: string
  ): Promise<IViewEntity | Record<string, unknown>> {
    const item = await this.notificationGroupRepository.findOne({
      _environmentId: environmentId,
      _id: entityId,
    });

    if (!item) {
      Logger.error(`Could not find notification group for id ${entityId}`);

      return {};
    }

    return {
      templateName: item.name,
    };
  }

  private async getTemplateDataForFeed(
    entityId: string,
    environmentId: string
  ): Promise<IViewEntity | Record<string, unknown>> {
    let item = await this.feedRepository.findOne({
      _environmentId: environmentId,
      _id: entityId,
    });

    if (!item) {
      const items = await this.feedRepository.findDeleted({ _id: entityId, _environmentId: environmentId });
      item = items[0];
      if (!item) {
        Logger.error(`Could not find feed for id ${entityId}`);

        return {};
      }
    }

    return {
      templateName: item.name,
    };
  }

  private async getTemplateDataForLayout(
    entityId: string,
    environmentId: string
  ): Promise<IViewEntity | Record<string, unknown>> {
    let item = await this.layoutRepository.findOne({
      _environmentId: environmentId,
      _id: entityId,
    });

    if (!item) {
      item = await this.layoutRepository.findDeleted(entityId, environmentId);
      if (!item) {
        Logger.error(`Could not find layout for id ${entityId}`);

        return {};
      }
    }

    return {
      templateName: item.name,
    };
  }
}
