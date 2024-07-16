import { IsUrl } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetBridgeStatusCommand extends BaseCommand {
  @IsUrl({
    require_protocol: true,
    require_tld: false,
  })
  bridgeUrl: string;
}
