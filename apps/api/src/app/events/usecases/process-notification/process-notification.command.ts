import { IsDefined, IsString, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export class ProcessNotificationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  subscriber: SubscriberEntity;

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsOptional()
  actorSubscriber?: SubscriberEntity | null;

  @IsDefined()
  template: NotificationTemplateEntity;

  @IsDefined()
  templateProviderIds: Map<ChannelTypeEnum, string>;
}
