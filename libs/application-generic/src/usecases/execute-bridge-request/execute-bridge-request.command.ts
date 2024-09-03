import { IsDefined, IsOptional, IsString } from 'class-validator';
import { AfterResponseHook } from 'got';
import {
  CodeResult,
  DiscoverOutput,
  ExecuteOutput,
  HealthCheck,
  Event,
  GetActionEnum,
  PostActionEnum,
  HttpQueryKeysEnum,
} from '@novu/framework';
import { BaseCommand } from '../../commands';

export class ExecuteBridgeRequestCommand extends BaseCommand {
  @IsString()
  bridgeUrl: string;

  @IsOptional()
  event?: Omit<Event, `${HttpQueryKeysEnum}`>;

  @IsString()
  apiKey: string;

  @IsOptional()
  searchParams?: Record<string, string>;

  @IsOptional()
  afterResponse?: AfterResponseHook;

  @IsDefined()
  action: PostActionEnum | GetActionEnum;

  @IsOptional()
  retriesLimit?: number;
}

// will generate the output type based on the action
export type ExecuteBridgeRequestDto<T extends PostActionEnum | GetActionEnum> =
  T extends GetActionEnum.DISCOVER
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
