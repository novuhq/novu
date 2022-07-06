import { IsDefined, IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { ButtonTypeEnum } from '@novu/shared';

export class MarkActionAsDoneCommand extends EnvironmentWithSubscriber {
  static create(data: MarkActionAsDoneCommand) {
    return CommandHelper.create<MarkActionAsDoneCommand>(MarkActionAsDoneCommand, data);
  }

  @IsMongoId()
  messageId: string;

  @IsDefined()
  executedType: ButtonTypeEnum;
}
