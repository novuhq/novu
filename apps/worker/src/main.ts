// Deep-path import (not the package barrel) so hydrating secrets doesn't evaluate
// @novu/application-generic before OTEL instrumentation is installed in ./bootstrap.
import { runWithHydratedSecrets } from '@novu/application-generic/build/main/services/secrets-manager';
import { applyNovuTlsTrust, loadNovuTlsConfig } from '@novu/application-generic/build/main/services/tls';

void runWithHydratedSecrets(async () => {
  /*
   * Read the certificate after hydration so it can come from the secret store, and
   * trust the private CA before bootstrap opens any connection: the HTTPS agent
   * caches TLS sessions, so a later call would not pick the new roots up.
   */
  const tlsConfig = loadNovuTlsConfig();

  if (tlsConfig) {
    applyNovuTlsTrust(tlsConfig);
  }

  const { bootstrap } = await import('./bootstrap');
  await bootstrap(tlsConfig);
});
