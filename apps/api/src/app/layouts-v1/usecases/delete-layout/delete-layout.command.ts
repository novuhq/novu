import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { LayoutId } from '../../types';

export class DeleteLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutId: LayoutId;
}
