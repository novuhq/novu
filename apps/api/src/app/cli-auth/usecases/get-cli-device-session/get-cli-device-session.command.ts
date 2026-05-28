import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetCliDeviceSessionCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  readonly deviceCode: string;
}
