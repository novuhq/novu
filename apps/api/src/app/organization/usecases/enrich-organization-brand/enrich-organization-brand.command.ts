import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class EnrichOrganizationBrandCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  domain: string;
}
