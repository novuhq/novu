// Deep-path import (not the package barrel) so hydrating secrets doesn't evaluate
// @novu/application-generic before OTEL instrumentation is installed in ./bootstrap.
import { runWithHydratedSecrets } from '@novu/application-generic/build/main/services/secrets-manager';

void runWithHydratedSecrets(async () => {
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
});
