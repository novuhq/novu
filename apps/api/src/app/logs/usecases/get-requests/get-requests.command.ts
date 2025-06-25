import { IsNumber, IsOptional, IsString } from 'class-validator';
import { OrganizationCommand } from '@novu/application-generic';

export class GetRequestsCommand extends OrganizationCommand {
  @IsNumber()
  @IsOptional()
  public page?: number;

  @IsNumber()
  @IsOptional()
  public limit?: number;

  @IsNumber()
  @IsOptional()
  public statusCode?: number;

  @IsString()
  @IsOptional()
  public url?: string;

  @IsString()
  @IsOptional()
  public transactionId?: string;

  @IsNumber()
  @IsOptional()
  public days?: number;
}
