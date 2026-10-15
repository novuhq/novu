// Deep-path import (not the package barrel) so hydrating secrets doesn't evaluate
// @novu/application-generic before OTEL instrumentation is installed in ./bootstrap.
import { runWithHydratedSecrets } from '@novu/application-generic/build/main/services/secrets-manager';
import { applyNovuTlsTrust, loadNovuTlsConfig } from '@novu/application-generic/build/main/services/tls';

void runWithHydratedSecrets(async () => {
  /*
   * The TLS settings may come from the container, the secret store, or a dotenv
   * file, so dotenv has to be loaded before they are read. It loads after
   * hydration, and neither source overwrites a key that is already set, which keeps
   * the existing precedence.
   *
   * The private CA is trusted before bootstrap opens any connection: the HTTPS
   * agent caches TLS sessions, so a later call would not pick the new roots up.
   */
  await import('./config/env.config');
  const tlsConfig = loadNovuTlsConfig();

  if (tlsConfig) {
    applyNovuTlsTrust(tlsConfig);
  }

  const { bootstrap } = await import('./bootstrap');
  await bootstrap(tlsConfig);
});
