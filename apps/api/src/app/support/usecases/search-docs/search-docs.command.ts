import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchDocsCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @IsDefined()
  @IsString()
  userId: string;
}
