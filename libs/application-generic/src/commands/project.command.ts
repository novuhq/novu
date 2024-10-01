import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

import { DirectionEnum, UserSessionData } from '@novu/shared';

import { BaseCommand } from './base.command';

export abstract class EnvironmentLevelCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  readonly organizationId?: string;
}

export abstract class EnvironmentLevelWithUserCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  readonly organizationId?: string;

  @IsNotEmpty()
  readonly userId: string;
}

export abstract class OrganizationLevelCommand extends BaseCommand {
  readonly environmentId?: string;

  @IsNotEmpty()
  readonly organizationId: string;
}

export abstract class OrganizationLevelWithUserCommand extends BaseCommand {
  readonly environmentId?: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly userId: string;
}

export abstract class EnvironmentWithUserCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly userId: string;
}

export abstract class EnvironmentWithUserObjectCommand extends BaseCommand {
  @IsNotEmpty()
  user: UserSessionData;
}

export abstract class PaginatedListCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsNumber()
  offset: number;

  @IsDefined()
  @IsNumber()
  limit: number;

  @IsDefined()
  @IsEnum(DirectionEnum)
  orderDirection: DirectionEnum;

  @IsDefined()
  @IsString()
  orderByField: string;
}

export abstract class EnvironmentWithSubscriber extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;

  @IsNotEmpty()
  readonly subscriberId: string;
}

export abstract class EnvironmentCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly organizationId: string;
}
