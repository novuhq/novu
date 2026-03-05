import { ICompileContext } from '@novu/application-generic';
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
}
