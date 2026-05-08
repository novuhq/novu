import { DomainRouteTypeEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsBoundedRecord } from '../../validators/bounded-record.validator';
import { IsEmailLocalPart } from '../../validators/email-local-part.validator';

export class CreateDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsNotEmpty()
  @IsEmailLocalPart()
  address: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsEnum(DomainRouteTypeEnum)
  @IsNotEmpty()
  type: DomainRouteTypeEnum;

  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;
}
