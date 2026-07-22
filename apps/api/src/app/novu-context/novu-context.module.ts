import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { NovuContextController } from './novu-context.controller';
import { BuildNovuContext } from './usecases/build-novu-context/build-novu-context.usecase';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [NovuContextController],
  providers: [BuildNovuContext],
})
export class NovuContextModule {}
