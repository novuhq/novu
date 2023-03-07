import { IsDefined, IsString, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { LayoutId } from '../../types';

export class CreateDefaultLayoutChangeCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;

  @IsString()
  @IsOptional()
  changeId?: string;

  @IsString()
  @IsOptional()
  parentChangeId?: string;
}
