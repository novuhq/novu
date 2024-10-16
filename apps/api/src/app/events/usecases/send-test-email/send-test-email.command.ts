import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { IEmailBlock } from '@novu/shared';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class SendTestEmailCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  contentType: 'customHtml' | 'editor';

  @IsDefined()
  payload: Record<string, unknown>;

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
  bridge?: boolean;

  @IsOptional()
  @IsString()
  stepId?: string | null;

  @IsOptional()
  controls: Record<string, unknown>;

  @IsOptional()
  @IsString()
  workflowId?: string | null;
}
