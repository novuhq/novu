import { ChannelTypeEnum, EnvironmentEnum, EnvironmentTypeEnum } from '@novu/shared';
import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateNovuIntegrationsCommand extends EnvironmentWithUserCommand {
  name: string | EnvironmentEnum;

  @IsOptional()
  @IsArray()
  @IsEnum(ChannelTypeEnum, { each: true })
  readonly channels?: ChannelTypeEnum[];

  @IsOptional()
  @IsBoolean()
  readonly includeManagedClaude?: boolean;

  /**
   * Type of the environment the integrations are being created for. Used to decide
   * secure-by-default behavior such as enabling HMAC on the in-app integration for
   * non-dev (production) environments. Left optional for backwards compatibility –
   * when omitted, the in-app integration falls back to the previous, less strict
   * defaults (HMAC off), which is appropriate for ad-hoc/keyless flows.
   */
  @IsOptional()
  @IsEnum(EnvironmentTypeEnum)
  readonly environmentType?: EnvironmentTypeEnum;
}
