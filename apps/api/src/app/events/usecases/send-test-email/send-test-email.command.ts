import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { IEmailBlock } from '@novu/shared';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class SendTestEmailCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  contentType: 'customHtml' | 'editor';

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsDefined()
  to: string | string[];

  @IsOptional()
  @IsString()
  layoutId?: string | null;

  @IsOptional()
  @IsBoolean()
  chimera?: boolean;

  @IsOptional()
  @IsString()
  stepId?: string | null;

  @IsOptional()
  inputs: any;

  @IsOptional()
  @IsString()
  workflowId?: string | null;
}
