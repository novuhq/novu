import { IsBoolean, IsDefined, IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetChangesCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsBoolean()
  promoted: boolean;

  @IsNumber()
  @IsOptional()
  page?: number = 0;

  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
