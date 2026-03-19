import { IsObject } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class LayoutVariablesSchemaCommand extends EnvironmentCommand {
  @IsObject()
  controlValues: Record<string, unknown>;
}
