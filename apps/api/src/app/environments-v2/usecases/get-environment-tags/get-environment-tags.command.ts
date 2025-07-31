import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty } from 'class-validator';

export class GetEnvironmentTagsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentIdOrIdentifier: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly userId: string;
}
