import { IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { ResourceOriginEnum } from '@novu/shared';

import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';

export class BuildLayoutIssuesCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsEnum(ResourceOriginEnum)
  resourceOrigin: ResourceOriginEnum;

  @IsObject()
  @IsOptional()
  controlValues: Record<string, unknown> | null;

  @IsObject()
  @IsDefined()
  controlSchema: JSONSchemaDto;
}
