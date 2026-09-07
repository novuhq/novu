import { ICompileContext } from '@novu/application-generic';
import type { EnvironmentEntity } from '@novu/dal';
import type { ExecuteOutput } from '@novu/framework/internal';
import type { SeverityLevelEnum } from '@novu/shared';
import { IsDefined, IsOptional } from 'class-validator';
import { SendMessageCommand } from './send-message.command';

export class SendMessageChannelCommand extends SendMessageCommand {
  @IsDefined()
  compileContext: ICompileContext;

  @IsOptional()
  bridgeData: ExecuteOutput | null;

  @IsOptional()
  severity?: SeverityLevelEnum;

  /**
   * The environment entity resolved once while building variables. Threaded through so downstream
   * consumers (e.g. outbound webhook dispatch) can reuse it instead of issuing redundant DB reads.
   */
  @IsOptional()
  environment?: EnvironmentEntity;
}
