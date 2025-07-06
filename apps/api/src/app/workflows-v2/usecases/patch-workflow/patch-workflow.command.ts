import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PatchWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsNotEmpty()
  workflowIdOrInternalId: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  payloadSchema?: object;

  @IsBoolean()
  @IsOptional()
  validatePayload?: boolean;

  @IsBoolean()
  @IsOptional()
  isTranslationEnabled?: boolean;
}
