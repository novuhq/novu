import { NotificationStepEntity } from '@novu/dal';
import { DigestTypeEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class DigestFilterStepsCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  _subscriberId: string;

  @IsDefined()
  payload: any;

  @IsDefined()
  steps: NotificationStepEntity[];

  @IsMongoId()
  templateId: string;

  @IsMongoId()
  notificationId: string;

  @IsString()
  transactionId: string;

  @IsString()
  type: DigestTypeEnum;

  @IsBoolean()
  @IsOptional()
  backoff?: boolean;
}
