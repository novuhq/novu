import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ResourceOriginEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsObject, IsOptional } from 'class-validator';

import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';

export class BuildLayoutIssuesCommand extends EnvironmentWithUserCommand {
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
