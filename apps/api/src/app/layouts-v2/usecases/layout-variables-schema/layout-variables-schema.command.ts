import { IsObject } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';

export class LayoutVariablesSchemaCommand extends EnvironmentWithUserObjectCommand {
  @IsObject()
  controlValues: Record<string, unknown>;
}
