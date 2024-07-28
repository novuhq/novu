import { IsNotEmpty } from 'class-validator';
import { BaseCommand } from './base.command';

export { BaseCommand };

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
}
