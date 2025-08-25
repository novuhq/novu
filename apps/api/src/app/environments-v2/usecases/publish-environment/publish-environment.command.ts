import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
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
