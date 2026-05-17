import {
  CodeResult,
  DiscoverOutput,
  Event,
  ExecuteOutput,
  GetActionEnum,
  HealthCheck,
  HttpQueryKeysEnum,
  PostActionEnum,
} from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentLevelCommand } from '../../commands';

export type BridgeError = {
  url: string;
  code: string;
  message: string;
  statusCode: number;
  data?: unknown;
  cause?: unknown;
};

export type ProcessError = (response: BridgeError) => Promise<void>;

export class ExecuteBridgeRequestCommand extends EnvironmentLevelCommand {
  @IsOptional()
  event?: Omit<Event, `${HttpQueryKeysEnum}`>;

  @IsOptional()
  searchParams?: Partial<Record<HttpQueryKeysEnum | 'skipLayoutRendering' | 'jobId' | 'layoutId', string>>;

  @IsOptional()
  processError?: ProcessError;

  @IsDefined()
  action: PostActionEnum | GetActionEnum;

  @IsOptional()
  retriesLimit?: number;

  @IsDefined()
  workflowOrigin: ResourceOriginEnum;

  @IsOptional()
  statelessBridgeUrl?: string;

  @IsOptional()
  @IsString()
  stepResolverHash?: string;

  /**
   * Enforce SSRF protection on the outbound bridge HTTP call (DNS-pinned
   * connect-time guard + redirect re-validation via `HttpClientService`).
   *
   * Use for endpoints that accept a user-controlled bridgeUrl (e.g.
   * `/bridge/sync`, `/bridge/validate`) so attacker-controlled IP literals
   * (loopback / RFC1918 / link-local / cloud metadata) cannot reach internal
   * services. Leave undefined for trusted internal callers.
   */
  @IsOptional()
  @IsBoolean()
  enforceSsrfProtection?: boolean;
}

// will generate the output type based on the action
export type ExecuteBridgeRequestDto<T extends PostActionEnum | GetActionEnum> = T extends GetActionEnum.DISCOVER
  ? DiscoverOutput
  : T extends GetActionEnum.HEALTH_CHECK
    ? HealthCheck
    : T extends GetActionEnum.CODE
      ? CodeResult
      : T extends PostActionEnum.EXECUTE
        ? ExecuteOutput
        : T extends PostActionEnum.PREVIEW
          ? ExecuteOutput
          : never;
