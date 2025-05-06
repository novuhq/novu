import { IsArray, IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '@novu/application-generic';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;
}
