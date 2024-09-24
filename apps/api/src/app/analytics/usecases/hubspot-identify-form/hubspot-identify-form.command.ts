import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsString, IsOptional } from 'class-validator';

export class HubspotIdentifyFormCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  hubspotContext?: string;

  @IsOptional()
  @IsString()
  pageUri?: string;

  @IsOptional()
  @IsString()
  pageName?: string;

  @IsDefined()
  @IsString()
  organizationId: string;
}
