import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { CliDeviceSessionUser } from '../../services/cli-device-session.service';

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
  readonly environmentSlug?: string | null;

  @IsOptional()
  @IsString()
  readonly environmentName?: string | null;

  @IsOptional()
  @IsString()
  readonly environmentOrganizationId?: string | null;

  @IsOptional()
  readonly user?: CliDeviceSessionUser | null;
}
