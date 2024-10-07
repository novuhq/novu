import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { JsonSchema } from '@novu/framework';
import { NotificationStepEntity } from '@novu/dal';
import { OrganizationLevelCommand } from '../../commands';

export class UpsertControlValuesCommand extends OrganizationLevelCommand {
  @IsObject()
  notificationStepEntity: NotificationStepEntity;

  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsObject()
  @IsOptional()
  newControlValues?: Record<string, unknown>;

  @IsObject()
  controlSchemas: { schema: JsonSchema };
}
