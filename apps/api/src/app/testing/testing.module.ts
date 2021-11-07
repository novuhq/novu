import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { TestingController } from './testing.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES],
  controllers: [TestingController],
})
export class TestingModule {}
