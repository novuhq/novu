import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { ClientSession } from '@novu/dal';
import { AiResourceTypeEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertChatCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsArray()
  messages?: unknown[];

  @IsOptional()
  @IsString()
  activeStreamId?: string | null;

  @IsOptional()
  @IsEnum(AiResourceTypeEnum)
  resourceType?: AiResourceTypeEnum;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsBoolean()
  hasPendingChanges?: boolean;

  @IsOptional()
  @IsString()
  resumeCheckpointId?: string | null;

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
