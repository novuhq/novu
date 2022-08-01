import { IsDefined, IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { NotificationStepEntity } from '@novu/dal';

export class FilterStepsCommand extends EnvironmentWithUserCommand {
  static create(data: FilterStepsCommand) {
    return CommandHelper.create(FilterStepsCommand, data);
  }

  @IsMongoId()
  subscriberId: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  steps: NotificationStepEntity[];

  @IsMongoId()
  templateId: string;
}
