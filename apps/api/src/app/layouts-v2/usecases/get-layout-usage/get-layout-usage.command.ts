import { IsString } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class GetLayoutUsageCommand extends EnvironmentCommand {
  @IsString()
  layoutIdOrInternalId: string;
}
