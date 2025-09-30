import { EnvironmentCommand } from '@novu/application-generic';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetRequestsCommand extends EnvironmentCommand {
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
  urlPattern?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  @IsNumber()
  createdGte?: number;
}
