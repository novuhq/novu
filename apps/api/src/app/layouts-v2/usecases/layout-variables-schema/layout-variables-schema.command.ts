import { IsObject } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class LayoutVariablesSchemaCommand extends EnvironmentCommand {
  @IsObject()
  controlValues: Record<string, unknown>;
}
