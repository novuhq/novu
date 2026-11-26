import { EnvironmentCommand } from '@novu/application-generic';
import { IsBoolean, IsString } from 'class-validator';

export class GetRequestCommand extends EnvironmentCommand {
  @IsString()
  requestId: string;

  /** Whether traces keep their raw data, which can hold the provider's credentials. */
  @IsBoolean()
  includeRawTraces: boolean;
}
