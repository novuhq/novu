import { HumanInteractionStatusEnum } from '@novu/shared';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ListInteractionsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsEnum(HumanInteractionStatusEnum)
  status?: HumanInteractionStatusEnum;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  before?: string;
}
