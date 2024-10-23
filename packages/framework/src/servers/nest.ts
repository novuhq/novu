/*
 * Re-export all top level exports from the main package.
 * This results in better DX reduces the chances of the dual package hazard for ESM + CJS packages.
 *
 * Example:
 *
 * import { NovuModule, Client, type Workflow } from '@novu/framework/nest';
 *
 * instead of
 *
 * import { NovuModule } from '@novu/framework/nest';
 * import { Client, type Workflow } from '@novu/framework';
 */
export * from '../index';
export * from './nest/nest.constants';
export * from './nest/nest.controller';
export * from './nest/nest.interface';
export * from './nest/nest.module';
export * from './nest/nest.register-api-path';
export * from './nest/nest.client';
export * from './nest/nest.handler';
