import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationStepEntity } from '@novu/dal';
import { EnvironmentCommand } from '../../commands';

export class UpsertControlValuesCommand extends EnvironmentCommand {
  @IsObject()
  notificationStepEntity: NotificationStepEntity;

  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsObject()
  @IsOptional()
  newControlValues?: Record<string, unknown>;
}
