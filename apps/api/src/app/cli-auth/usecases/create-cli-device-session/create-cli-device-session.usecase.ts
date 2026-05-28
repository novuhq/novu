import { Injectable } from '@nestjs/common';
import {
  CliDeviceSessionService,
  CreateCliDeviceSessionResult,
} from '../../services/cli-device-session.service';
import { CreateCliDeviceSessionCommand } from './create-cli-device-session.command';

@Injectable()
export class CreateCliDeviceSession {
  constructor(private readonly cliDeviceSessionService: CliDeviceSessionService) {}

  execute(command: CreateCliDeviceSessionCommand): Promise<CreateCliDeviceSessionResult> {
    return this.cliDeviceSessionService.create({ name: command.name });
  }
}
