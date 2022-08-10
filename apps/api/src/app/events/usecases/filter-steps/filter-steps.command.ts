import { IsDefined, IsMongoId } from 'class-validator';
import { NotificationStepEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class FilterStepsCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  subscriberId: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  steps: NotificationStepEntity[];

  @IsMongoId()
  templateId: string;
}
