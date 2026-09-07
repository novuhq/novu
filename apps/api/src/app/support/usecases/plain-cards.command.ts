import { BaseCommand } from '@novu/application-generic';
import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { PlainCustomer, PlainTenant, PlainThread } from '../dtos/plain-card.dto';

export class PlainCardsCommand extends BaseCommand {
  @IsOptional()
  @IsArray()
  cardKeys?: string[];

  @IsOptional()
  customer?: PlainCustomer | null;

  @IsOptional()
  tenant?: PlainTenant | null;

  @IsOptional()
  thread?: PlainThread | null;

  @IsDefined()
  @IsString()
  timestamp: string;
}
