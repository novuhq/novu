import { IsDefined, IsHexColor, IsOptional, IsUrl } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateBrandingDetailsCommand extends AuthenticatedCommand {
  @IsDefined()
  public readonly id: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  logo: string;

  @IsOptional()
  @IsHexColor()
  color: string;

  @IsOptional()
  @IsHexColor()
  fontColor: string;

  @IsOptional()
  @IsHexColor()
  contentBackground: string;

  @IsOptional()
  fontFamily?: string;
}
