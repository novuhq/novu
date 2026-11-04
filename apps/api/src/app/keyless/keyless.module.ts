import { Module } from '@nestjs/common';
import { HumanContactRepository } from '@novu/dal';
import { ConnectModule } from '../connect/connect.module';
import { SharedModule } from '../shared/shared.module';
import { KeylessAbuseGuardService } from './keyless-abuse-guard.service';
import { KeylessEmailGateService } from './keyless-email-gate.service';
import { KeylessVoiceGateService } from './keyless-voice-gate.service';

@Module({
  imports: [SharedModule, ConnectModule],
  providers: [KeylessAbuseGuardService, KeylessEmailGateService, KeylessVoiceGateService, HumanContactRepository],
  exports: [KeylessAbuseGuardService, KeylessEmailGateService, KeylessVoiceGateService],
})
export class KeylessModule {}
