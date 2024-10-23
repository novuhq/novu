import { BaseCommand } from '@novu/application-generic';
import { JSONSchemaDto } from '@novu/shared';

export class ExtractDefaultsCommand extends BaseCommand {
  jsonSchemaDto: JSONSchemaDto;
}
