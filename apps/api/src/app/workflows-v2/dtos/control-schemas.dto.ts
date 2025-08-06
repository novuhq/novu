import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { UiSchema } from './ui-schema.dto';

export class ControlSchemasDto {
  schema: JSONSchemaDto;
  uiSchema?: UiSchema;
}
