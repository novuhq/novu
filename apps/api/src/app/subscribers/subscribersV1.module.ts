import { DynamicModule, ForwardReference, forwardRef, Module, Type } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { PreferencesModule } from '../preferences';
import { SharedModule } from '../shared/shared.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { SubscribersV1Controller } from './subscribersV1.controller';
import { USE_CASES } from './usecases';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const imports: (Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference<any>)[] = [];
  if (process.env.NOVU_ENTERPRISE === 'true') {
    imports.push(OutboundWebhooksModule);
  }
  return imports;
};

@Module({
  imports: [
    SharedModule,
    AuthModule,
    TerminusModule,
    forwardRef(() => WidgetsModule),
    PreferencesModule,
    ...enterpriseImports(),
  ],
  controllers: [SubscribersV1Controller],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class SubscribersV1Module {}
