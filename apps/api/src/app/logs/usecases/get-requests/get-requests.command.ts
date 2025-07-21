import { IsArray, IsNumber, IsOptional, IsString, IsDate } from 'class-validator';
import { OrganizationCommand } from '@novu/application-generic';

export class GetRequestsCommand extends OrganizationCommand {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  statusCodes?: number[];

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  public url_pattern?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  createdGte?: number;
}
