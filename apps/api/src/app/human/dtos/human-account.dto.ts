import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { HumanRegion } from '../../shared/helpers/resolve-human-website-base-url';

/** Clerk user IDs of the Human Clerk app, e.g. `user_2abc…`. Also used as the local part of the made-up email. */
export const HUMAN_USER_ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

/** Device codes of `POST /v1/cli/device-sessions`, which `human login` opens the Human website with. */
export const CLI_DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export class EnsureHumanAccountRequestDto {
  @IsString()
  @Matches(HUMAN_USER_ID_PATTERN)
  humanUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string;
}

export class ClaimHumanAccountRequestDto extends EnsureHumanAccountRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token: string;
}

export class ApproveHumanCliLoginRequestDto extends EnsureHumanAccountRequestDto {
  @IsString()
  @Matches(CLI_DEVICE_CODE_PATTERN)
  deviceCode: string;

  /** The operator's email on the Human account. Only handed to the CLI, so it can say who logged in. */
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
}

export interface HumanAccountResponseDto {
  organizationId: string;
  userId: string;
  environmentId: string;
  region: HumanRegion;
}

export interface HumanAccountClaimResponseDto {
  environmentId: string;
  agentIdentifier?: string;
}

export interface HumanAccountCliLoginResponseDto {
  environmentId: string;
}

export interface HumanAccountSecretKeyResponseDto {
  environmentId: string;
  secretKey: string;
}
