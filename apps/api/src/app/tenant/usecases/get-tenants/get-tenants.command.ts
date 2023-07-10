import { IsNumber, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetTenantsCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page: number;

  @IsNumber()
  @IsOptional()
  limit: number;
}
