import { Module, DynamicModule } from '@nestjs/common';
import { NovuService } from './nest.service';
import { NovuController } from './nest.controller';
import { ServeHandlerOptions } from '../../handler';
import { API_PATH, SERVE_HANDLER_OPTIONS } from './nest.constants';
import { registerControllerPath } from './nest.decorator';

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
export class NovuModule {
  /**
   * Register the Novu module
   *
   * @param apiPath - The path to serve
   * @param options - The options to register the Novu module
   * @returns The Novu module
   */
  static register(apiPath: string, options: ServeHandlerOptions): DynamicModule {
    return {
      module: NovuModule,
      controllers: [NovuController],
      providers: [
        {
          provide: API_PATH,
          useValue: apiPath,
        },
        {
          provide: SERVE_HANDLER_OPTIONS,
          useValue: options,
        },
        registerControllerPath,
        NovuService,
      ],
      exports: [NovuService],
    };
  }
}
