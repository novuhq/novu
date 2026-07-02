import { DomainRouteTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsBoundedRecord } from '../../validators/bounded-record.validator';

export class UpdateDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsEnum(DomainRouteTypeEnum)
  @IsOptional()
  type?: DomainRouteTypeEnum;

  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;
}
