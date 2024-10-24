import { Module, Logger, DynamicModule } from '@nestjs/common';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { ShutdownModule } from './shutdown.module';
import { ShutdownService } from './shutdown.service';

@Module({})
export class GracefulShutdownConfigModule {
  static forRootAsync(): DynamicModule {
    return {
      module: GracefulShutdownConfigModule,
      imports: [
        GracefulShutdownModule.forRootAsync({
          imports: [ShutdownModule],
          inject: [ShutdownService],
          useFactory: async (shutdownService: ShutdownService) => {
            const logger = new Logger('GracefulShutdownConfigModule');
            logger.log('Initialized GracefulShutdownModule with async factory');

            // * Write any async logic here

            const { timeout } = shutdownService;
            logger.log(`Configured graceful shutdown timeout: ${timeout}`);

            return {
              gracefulShutdownTimeout: timeout,
            };
          },
        }),
      ],
      exports: [GracefulShutdownModule],
    };
  }
}
