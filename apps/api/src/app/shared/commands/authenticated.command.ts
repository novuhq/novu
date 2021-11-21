import { IsNotEmpty } from 'class-validator';

export abstract class AuthenticatedCommand {
  @IsNotEmpty()
  public readonly userId: string;
}
