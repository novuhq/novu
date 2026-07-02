import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { KeylessAbuseGuardService } from './keyless-abuse-guard.service';

@Module({
  imports: [SharedModule],
  providers: [KeylessAbuseGuardService],
  exports: [KeylessAbuseGuardService],
})
export class KeylessModule {}
