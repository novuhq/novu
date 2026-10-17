import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetKeylessClaimSourceCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;
}
