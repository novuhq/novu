import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsString, IsObject, IsOptional } from 'class-validator';
import { JSONSchemaDto } from '../../dtos';

export class CreateVariablesObjectCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsOptional()
  workflowId?: string;

  /**
   * Control values used for preview purposes
   * The payload schema is used for control values validation and sanitization
   */
  @IsObject()
  @IsOptional()
  controlValues?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  payloadSchema?: JSONSchemaDto;
}
