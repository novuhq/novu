import { IsNotEmpty } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export abstract class AuthenticatedCommand extends BaseCommand {
  @IsNotEmpty()
  public readonly userId: string;
}
