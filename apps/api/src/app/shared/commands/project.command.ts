import { IsNotEmpty } from 'class-validator';

export abstract class ApplicationWithUserCommand {
  @IsNotEmpty()
  readonly applicationId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly userId: string;
}

export abstract class ApplicationWithSubscriber {
  @IsNotEmpty()
  readonly applicationId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly subscriberId: string;
}

export abstract class ApplicationCommand {
  @IsNotEmpty()
  readonly applicationId: string;

  @IsNotEmpty()
  readonly organizationId: string;
}
