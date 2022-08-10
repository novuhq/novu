import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsArray, IsBoolean, IsOptional } from 'class-validator';

export class GetUnseenCountCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsBoolean()
  @IsOptional()
  seen?: boolean;
}
