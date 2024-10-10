import { Module, Provider } from '@nestjs/common';
import { NovuClient } from './nest.client';
import { NovuController } from './nest.controller';
import { registerApiPath } from './nest.register-api-path';
import { ASYNC_OPTIONS_TYPE, NovuBaseModule, OPTIONS_TYPE } from './nest.module-definition';
import { NovuHandler } from './nest.handler';

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
 *     NovuModule.register({
 *       apiPath: '/api/novu',
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
   * @param customProviders - Custom providers to register. These will be merged with the default providers.
   * @returns The Novu module
   */
  static register(options: typeof OPTIONS_TYPE, customProviders?: Provider[]) {
    const superModule = super.register(options);

    superModule.controllers = [NovuController];
    superModule.providers?.push(registerApiPath, NovuClient, NovuHandler, ...(customProviders || []));
    superModule.exports = [NovuClient, NovuHandler];

    return superModule;
  }

  /**
   * Register the Novu module asynchronously
   *
   * @param options - The options to register the Novu module
   * @param customProviders - Custom providers to register. These will be merged with the default providers.
   * @returns The Novu module
   */
  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE, customProviders?: Provider[]) {
    const superModule = super.registerAsync(options);

    superModule.controllers = [NovuController];
    superModule.providers?.push(registerApiPath, NovuClient, NovuHandler, ...(customProviders || []));
    superModule.exports = [NovuClient, NovuHandler];

    return superModule;
  }
}
