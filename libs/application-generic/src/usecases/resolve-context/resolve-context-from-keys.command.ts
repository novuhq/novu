import { ContextKey } from '@novu/shared';
import { ArrayMaxSize, IsArray, IsDefined, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';

export class ResolveContextFromKeysCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  contextKeys: ContextKey[];
}
