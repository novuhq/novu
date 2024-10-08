import { Module } from '@nestjs/common';
import { NovuService } from './nest.service';
import { NovuController } from './nest.controller';
import { NOVU_OPTIONS } from './nest.constants';
import { registerApiPath } from './nest.decorator';
import { ASYNC_OPTIONS_TYPE, NovuBaseModule, OPTIONS_TYPE } from './nest-base.module';

/**
 * In NestJS, serve and register any declared workflows with Novu, making
 * them available to be triggered by events.
 *
 * @example
 * ```ts
 * import { NovuModule } from "@novu/framework/nest";
 * import { myWorkflow } from "./src/novu/workflows"; // Your workflows
 *
 * @Module({
 *   imports: [
 *     // Expose the middleware on our recommended path at `/api/novu`.
 *     NovuModule.register('/api/novu', {
 *       workflows: [myWorkflow]
 *     })
 *   ]
 * })
 * export class AppModule {}
 *
 * const app = await NestFactory.create(AppModule);
 *
 * // Important:  ensure you add JSON middleware to process incoming JSON POST payloads.
 * app.use(express.json());
 * ```
 */
@Module({})
export class NovuModule extends NovuBaseModule {
  /**
   * Register the Novu module
   *
   * @param options - The options to register the Novu module
   * @returns The Novu module
   */
  static register(options: typeof OPTIONS_TYPE) {
    return {
      ...super.register(options),
      controllers: [NovuController],
      providers: [
        {
          provide: NOVU_OPTIONS,
          useValue: options,
        },
        registerApiPath,
        NovuService,
      ],
      exports: [NovuService],
    };
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE) {
    return {
      ...super.registerAsync(options),
      controllers: [NovuController],
      providers: [
        {
          provide: NOVU_OPTIONS,
          useValue: options,
        },
        registerApiPath,
        NovuService,
      ],
      exports: [NovuService],
    };
  }
}
