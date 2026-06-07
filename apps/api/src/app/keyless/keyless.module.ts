import { Module } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { KeylessAbuseGuardService } from './keyless-abuse-guard.service';

@Module({
  imports: [SharedModule],
  providers: [KeylessAbuseGuardService, AgentRepository],
  exports: [KeylessAbuseGuardService],
})
export class KeylessModule {}
