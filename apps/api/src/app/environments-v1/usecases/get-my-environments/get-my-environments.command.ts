import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class GetMyEnvironmentsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  readonly environmentId: string;

  @IsOptional()
  readonly returnApiKeys: boolean;

  @IsOptional()
  readonly userId: string;
}
