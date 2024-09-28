import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { EnvironmentWithSubscriber } from '../../commands/project.command';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  readOnly?: boolean;
}
