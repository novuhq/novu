import { IsDefined, IsMongoId } from 'class-validator';
import { NotificationStepEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DigestFilterStepsCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  subscriberId: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  steps: NotificationStepEntity[];

  @IsMongoId()
  templateId: string;

  @IsMongoId()
  notificationId: string;
}
