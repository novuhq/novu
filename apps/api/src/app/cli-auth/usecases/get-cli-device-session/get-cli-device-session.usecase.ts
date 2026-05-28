import { Injectable } from '@nestjs/common';
import {
  CliDeviceSessionService,
  PollCliDeviceSessionResult,
} from '../../services/cli-device-session.service';
import { GetCliDeviceSessionCommand } from './get-cli-device-session.command';

@Injectable()
export class GetCliDeviceSession {
  constructor(private readonly cliDeviceSessionService: CliDeviceSessionService) {}

  execute(command: GetCliDeviceSessionCommand): Promise<PollCliDeviceSessionResult> {
    return this.cliDeviceSessionService.poll(command.deviceCode);
  }
}
