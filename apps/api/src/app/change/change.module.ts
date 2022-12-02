import { forwardRef, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { ChangesController } from './changes.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule)],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [ChangesController],
})
export class ChangeModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
