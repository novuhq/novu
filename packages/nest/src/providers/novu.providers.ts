import { Provider } from '@nestjs/common';
import { NovuStateless } from '@novu/stateless';
import { NOVU_OPTIONS } from '../helpers/constants';
import {
  INovuModuleAsyncOptions,
  INovuOptions,
  INovuOptionsFactory,
} from '../interfaces';
import { NovuService } from '../services';

async function novuServiceFactory(options: INovuOptions) {
  const novu = new NovuStateless();
  if (options.providers) {
    for (const provider of options.providers) {
      await novu.registerProvider(provider);
    }
  }

  if (options.templates) {
    for (const template of options.templates) {
      await novu.registerTemplate(template);
    }
  }

  return novu;
}

export function createNovuProviders(options: INovuOptions): Provider[] {
  return [
    {
      provide: NovuService,
      useFactory: novuServiceFactory,
      inject: [NOVU_OPTIONS],
    },
    {
      provide: NOVU_OPTIONS,
      useValue: options,
    },
  ];
}

export function createAsyncNovuProviders(
  options: INovuModuleAsyncOptions
): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: NovuService,
        useFactory: novuServiceFactory,
        inject: [NOVU_OPTIONS],
      },
      {
        provide: NOVU_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
    ];
  }

  return [
    {
      provide: NovuService,
      useFactory: novuServiceFactory,
      inject: [NOVU_OPTIONS],
    },
    {
      provide: NOVU_OPTIONS,
      useFactory: (instance: INovuOptionsFactory) =>
        instance.createNovuOptions(),
      inject: [options.useExisting || options.useClass],
    },
  ];
}
