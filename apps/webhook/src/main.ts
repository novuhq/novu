// Imported via the deep path (not the package barrel) so hydrating secrets into
// process.env does not evaluate @novu/application-generic — and therefore keeps
// pino/mongoose/ioredis out of require.cache — before OTEL instrumentation is
// installed in ./bootstrap.
import { runWithHydratedSecrets } from '@novu/application-generic/build/main/services/secrets-manager';

void runWithHydratedSecrets(async () => {
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
});
