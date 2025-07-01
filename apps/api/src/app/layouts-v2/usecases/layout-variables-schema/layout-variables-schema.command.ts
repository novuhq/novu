import { IsObject } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class LayoutVariablesSchemaCommand extends EnvironmentWithUserCommand {
  @IsObject()
  controlValues: Record<string, unknown>;
}
