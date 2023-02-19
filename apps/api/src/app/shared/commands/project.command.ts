import { IsNotEmpty } from 'class-validator';
import { BaseCommand } from './base.command';

export { BaseCommand };

export abstract class EnvironmentWithUserCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly userId: string;
}

export abstract class EnvironmentWithSubscriber extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly subscriberId: string;
}

export abstract class EnvironmentCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;
}
