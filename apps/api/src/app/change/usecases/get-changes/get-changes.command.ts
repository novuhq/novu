import { IsBoolean, IsDefined, IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetChangesCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsBoolean()
  promoted: boolean;

  @IsNumber()
  @IsOptional()
  page = 0;

  @IsNumber()
  @IsOptional()
  limit = 10;
}
