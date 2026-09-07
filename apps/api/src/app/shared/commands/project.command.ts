import { BaseCommand } from '@novu/application-generic';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export abstract class EnvironmentCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;
}

export abstract class EnvironmentWithUserCommand extends EnvironmentCommand {
  @IsNotEmpty()
  readonly userId: string;
}

export abstract class EnvironmentWithSubscriber extends EnvironmentCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly subscriberId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly contextKeys?: string[];
}
