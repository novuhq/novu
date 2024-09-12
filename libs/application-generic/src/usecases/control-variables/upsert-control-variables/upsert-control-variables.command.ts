import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { JsonSchema } from '@novu/framework';

import { OrganizationLevelCommand } from '../../../commands';

export class UpsertControlVariablesCommand extends OrganizationLevelCommand {
  @IsMongoId()
  @IsNotEmpty()
  _workflowId: string;

  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsString()
  @IsNotEmpty()
  _stepId: string;

  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsObject()
  @IsOptional()
  controlValues?: Record<string, unknown>;

  @IsObject()
  defaultControls: { schema: JsonSchema };
}
