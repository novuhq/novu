import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class BuildVariableSchemaCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  workflow?: NotificationTemplateEntity;

  @IsOptional()
  @IsString()
  stepInternalId?: string;

  /**
   * Is needed for generation of payload schema before control values are stored
   */
  @IsOptional()
  optimisticControlValues?: Record<string, unknown>;
}
