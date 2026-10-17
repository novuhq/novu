import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { CliAuthController } from './cli-auth.controller';
import { CliDeviceSessionService } from './services/cli-device-session.service';
import { USE_CASES } from './usecases';
import { ApproveCliDeviceSession } from './usecases/approve-cli-device-session/approve-cli-device-session.usecase';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [CliAuthController],
  providers: [...USE_CASES, CliDeviceSessionService],
  exports: [ApproveCliDeviceSession, CliDeviceSessionService],
})
export class CliAuthModule {}
