import { IsNotEmpty } from 'class-validator';
import { BaseCommand } from '../../commands';

export class GetEnvironmentTagsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentIdOrIdentifier: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly userId: string;
}
