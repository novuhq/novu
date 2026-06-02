import { IsDefined, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class TriggerKeylessEventCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  @IsString()
  readonly workflowIdentifier: string;

  @IsDefined()
  readonly recipient: unknown;

  @IsOptional()
  @IsObject()
  readonly payload?: Record<string, unknown>;

  @IsNotEmpty()
  @IsString()
  readonly requestId: string;
}
