import { BaseCommand } from '@novu/application-generic';
import { IsOptional, IsString } from 'class-validator';

export class CreateCliDeviceSessionCommand extends BaseCommand {
  @IsOptional()
  @IsString()
  readonly name?: string;
}
