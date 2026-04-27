import { DomainRouteTypeEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsEmailLocalPart } from '../../validators/email-local-part.validator';

export class UpdateDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsOptional()
  @IsEmailLocalPart()
  address?: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsEnum(DomainRouteTypeEnum)
  @IsOptional()
  type?: DomainRouteTypeEnum;
}
