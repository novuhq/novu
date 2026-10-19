import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsMongoId } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdateNotificationActionCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsMongoId()
  readonly notificationId: string;

  @IsEnum(MessageActionStatusEnum)
  @IsDefined()
  readonly actionStatus: MessageActionStatusEnum;

  @IsEnum(ButtonTypeEnum)
  @IsDefined()
  readonly actionType: ButtonTypeEnum;
}
