import { IsDefined, IsMongoId, IsOptional } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';

export class UpdateMessageActionsCommand extends EnvironmentWithSubscriber {
  static create(data: UpdateMessageActionsCommand) {
    return CommandHelper.create<UpdateMessageActionsCommand>(UpdateMessageActionsCommand, data);
  }

  @IsMongoId()
  messageId: string;

  @IsDefined()
  type: ButtonTypeEnum;

  @IsDefined()
  status: MessageActionStatusEnum;

  @IsOptional()
  payload?: any;
}
