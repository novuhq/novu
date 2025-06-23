import { IsNumber, IsOptional, IsString } from 'class-validator';
import { OrganizationCommand } from '@novu/application-generic';

export class GetRequestsCommand extends OrganizationCommand {
  @IsNumber()
  @IsOptional()
  public page?: number;

  @IsNumber()
  @IsOptional()
  public limit?: number;

  @IsString()
  @IsOptional()
  public statusCode?: string;

  @IsString()
  @IsOptional()
  public url?: string;

  @IsString()
  @IsOptional()
  public transactionId?: string;

  @IsString()
  @IsOptional()
  public days?: string;
}
