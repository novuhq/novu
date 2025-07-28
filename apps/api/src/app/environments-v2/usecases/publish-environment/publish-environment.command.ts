import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceTypeEnum } from '../../types/sync.types';

export interface IResourceToPublish {
  resourceType: ResourceTypeEnum;
  resourceId: string;
}

export class PublishEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsString()
  sourceEnvironmentId?: string;

  @IsString()
  targetEnvironmentId: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  resources?: IResourceToPublish[];
}
