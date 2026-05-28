import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveCliDeviceSessionCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  readonly deviceCode: string;

  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  readonly organizationId: string;

  @IsString()
  @IsNotEmpty()
  readonly apiKey: string;

  @IsString()
  @IsNotEmpty()
  readonly environmentId: string;

  @IsOptional()
  @IsString()
  readonly userEmail?: string | null;

  @IsOptional()
  @IsString()
  readonly userFirstName?: string | null;

  @IsOptional()
  @IsString()
  readonly userLastName?: string | null;
}
