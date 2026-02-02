import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { AiResourceTypeEnum } from '@novu/shared';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
