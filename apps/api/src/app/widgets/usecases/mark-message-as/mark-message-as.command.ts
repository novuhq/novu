import { IsArray, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkMessageAsCommand extends EnvironmentWithSubscriber {
  @IsArray()
  messageIds: string[];

  @IsDefined()
  mark: { seen?: boolean; read?: boolean };

  @IsOptional()
  invalidate?: boolean;
}

export enum MarkEnum {
  SEEN = 'seen',
  READ = 'read',
}
