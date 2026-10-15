import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HumanContactRepository } from '@novu/dal';
import { ConnectModule } from '../connect/connect.module';
import { SharedModule } from '../shared/shared.module';
import { KeylessAbuseGuardService } from './keyless-abuse-guard.service';
import { KeylessEmailGateService } from './keyless-email-gate.service';
import { KeylessScopeInterceptor } from './keyless-scope.interceptor';
import { KeylessTriggerCapService } from './keyless-trigger-cap.service';

@Module({
  imports: [SharedModule, ConnectModule],
  providers: [
    KeylessAbuseGuardService,
    KeylessEmailGateService,
    KeylessTriggerCapService,
    HumanContactRepository,
    { provide: APP_INTERCEPTOR, useClass: KeylessScopeInterceptor },
  ],
  exports: [KeylessAbuseGuardService, KeylessEmailGateService],
})
export class KeylessModule {}
