import { IsDefined, IsHexColor, IsOptional, IsUrl } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateBrandingDetailsCommand extends AuthenticatedCommand {
  static create(data: UpdateBrandingDetailsCommand) {
    return CommandHelper.create<UpdateBrandingDetailsCommand>(UpdateBrandingDetailsCommand, data);
  }

  @IsDefined()
  public readonly id: string;

  @IsUrl({ require_tld: false })
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
