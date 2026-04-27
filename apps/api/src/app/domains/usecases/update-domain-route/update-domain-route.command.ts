import { DomainRouteTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domainId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsEnum(DomainRouteTypeEnum)
  @IsOptional()
  type?: DomainRouteTypeEnum;
}
