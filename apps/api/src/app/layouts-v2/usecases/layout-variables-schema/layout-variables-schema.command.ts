import { EnvironmentCommand } from '@novu/application-generic';
import { IsObject } from 'class-validator';

export class LayoutVariablesSchemaCommand extends EnvironmentCommand {
  @IsObject()
  controlValues: Record<string, unknown>;
}
