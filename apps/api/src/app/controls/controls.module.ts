import { forwardRef, Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { ControlsController } from './controls.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ControlsController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class ControlsModule {}
