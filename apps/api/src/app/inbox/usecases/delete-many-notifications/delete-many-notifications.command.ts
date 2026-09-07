import { IsArray, IsDefined, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class DeleteManyNotificationsCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  readonly ids: string[];
}
