import { Module } from '@nestjs/common';
import { NovuService } from './nest.service';
import { NovuController } from './nest.controller';
import { registerApiPath } from './nest.decorator';
import { ASYNC_OPTIONS_TYPE, NovuBaseModule, OPTIONS_TYPE } from './nest.module-definition';

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
@Module({
  controllers: [NovuController],
  providers: [registerApiPath, NovuService],
  exports: [NovuService],
})
export class NovuModule extends NovuBaseModule {
  /**
   * Register the Novu module
   *
   * @param options - The options to register the Novu module
   * @returns The Novu module
   */
  static register(options: typeof OPTIONS_TYPE) {
    const superModule = super.register(options);

    superModule.controllers = [NovuController];
    superModule.providers?.push(registerApiPath, NovuService);
    superModule.exports = [NovuService];

    return superModule;
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE) {
    const superModule = super.registerAsync(options);

    superModule.controllers = [NovuController];
    superModule.providers?.push(registerApiPath, NovuService);
    superModule.exports = [NovuService];

    return superModule;
  }
}
