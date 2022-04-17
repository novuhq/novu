import { IsHexColor, IsOptional, IsUrl } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateBrandingDetailsCommand extends EnvironmentWithUserCommand {
  static create(data: UpdateBrandingDetailsCommand) {
    return CommandHelper.create<UpdateBrandingDetailsCommand>(UpdateBrandingDetailsCommand, data);
  }

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
