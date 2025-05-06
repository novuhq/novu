import { IsNotEmpty, IsOptional } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetMyEnvironmentsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  readonly environmentId: string;

  @IsOptional()
  readonly includeAllApiKeys: boolean;
}
