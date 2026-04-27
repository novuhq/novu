import { DomainRouteTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domainId: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsEnum(DomainRouteTypeEnum)
  @IsNotEmpty()
  type: DomainRouteTypeEnum;
}
