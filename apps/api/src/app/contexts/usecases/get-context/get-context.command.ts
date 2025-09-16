import { ContextTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetContextCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsEnum(ContextTypeEnum)
  @IsOptional()
  type?: ContextTypeEnum;
}
