import { DomainRouteTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

class RouteCommand {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsEnum(DomainRouteTypeEnum)
  @IsNotEmpty()
  type: DomainRouteTypeEnum;
}

export class UpdateDomainCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domainId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteCommand)
  @IsOptional()
  routes?: RouteCommand[];
}
