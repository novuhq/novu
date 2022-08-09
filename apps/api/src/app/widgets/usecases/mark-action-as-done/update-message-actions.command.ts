import { IsDefined, IsMongoId, IsOptional } from 'class-validator';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdateMessageActionsCommand extends EnvironmentWithSubscriber {
  @IsMongoId()
  messageId: string;

  @IsDefined()
  type: ButtonTypeEnum;

  @IsDefined()
  status: MessageActionStatusEnum;

  @IsOptional()
  payload?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
