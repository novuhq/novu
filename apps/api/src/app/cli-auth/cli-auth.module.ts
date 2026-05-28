import { Module } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { CliAuthController } from './cli-auth.controller';
import { CliDeviceSessionService } from './services/cli-device-session.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [CliAuthController],
  providers: [...USE_CASES, CliDeviceSessionService, EnvironmentRepository],
})
export class CliAuthModule {}
