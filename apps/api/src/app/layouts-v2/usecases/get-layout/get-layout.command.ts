import { IsString, IsDefined } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';

export class GetLayoutCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  layoutIdOrInternalId: string;
}
