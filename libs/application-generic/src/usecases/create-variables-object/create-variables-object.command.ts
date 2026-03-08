import { IsArray, IsDefined, IsObject, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../commands';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';

export class CreateVariablesObjectCommand extends EnvironmentCommand {
  @IsDefined()
  @IsArray()
  controlValues: unknown[];

  @IsObject()
  @IsOptional()
  payloadSchema?: JSONSchemaDto;

  @IsObject()
  @IsOptional()
  variableSchema?: JSONSchemaDto;
}
