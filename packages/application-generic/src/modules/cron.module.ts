import { Module, Provider } from '@nestjs/common';
import { cronService } from '../custom-providers';
import { AgendaCronService } from '../services';
import { MetricsModule } from './metrics.module';

const PROVIDERS: Provider[] = [cronService, AgendaCronService];

@Module({
  imports: [MetricsModule],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class CronModule {}
