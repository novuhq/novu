import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class GetRequestsCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  public page?: number;

  @IsNumber()
  @IsOptional()
  public limit?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  statusCodes?: number[];

  @IsString()
  @IsOptional()
  public url?: string;

  @IsString()
  @IsOptional()
  public url_pattern?: string;

  @IsString()
  @IsOptional()
  public transactionId?: string;

  @IsNumber()
  @IsOptional()
  public hoursAgo?: number;
}
