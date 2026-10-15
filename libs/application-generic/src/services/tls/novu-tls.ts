import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as tls from 'node:tls';
import { parseBooleanString } from '../secrets-manager/secrets-manager.service';

/**
 * Opt-in end-to-end TLS for enterprise self-hosted images. Certificate material is
 * supplied through the environment (inline base64 or a mounted file) and fed to the
 * Nest HTTP server. The private CA is only trusted on requests addressed to Novu
 * itself (see `getNovuServiceCa`); the process-wide trust store is left alone so
 * provider, webhook, and external bridge calls keep verifying against public roots.
 *
 * Every variable is optional: with `NOVU_TLS_ENABLED` unset the loader returns
 * `undefined` and each service keeps listening on plain HTTP exactly as before.
 */
export interface NovuTlsConfig {
  cert: string;
  key: string;
  ca: string;
  passphrase?: string;
}

/**
 * Reads one PEM blob from either `<prefix>_BASE64` or `<prefix>_FILE`. Requiring
 * exactly one of the two keeps a stale leftover variable from silently shadowing
 * the value the operator actually meant to use.
 */
function readMaterial(variablePrefix: string): string {
  const base64Variable = `${variablePrefix}_BASE64`;
  const fileVariable = `${variablePrefix}_FILE`;
  const base64Value = process.env[base64Variable]?.trim();
  const fileValue = process.env[fileVariable]?.trim();

  if (base64Value && fileValue) {
    throw new Error(`${base64Variable} and ${fileVariable} are both set. Provide exactly one of them.`);
  }

  if (!base64Value && !fileValue) {
    throw new Error(`NOVU_TLS_ENABLED is true but neither ${base64Variable} nor ${fileVariable} is set.`);
  }

  const sourceVariable = base64Value ? base64Variable : fileVariable;

  let material: string;
  try {
    material = base64Value ? Buffer.from(base64Value, 'base64').toString('utf8') : readFileSync(`${fileValue}`, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';

    throw new Error(`${sourceVariable} could not be read: ${reason}`);
  }

  if (!material.includes('-----BEGIN')) {
    throw new Error(`${sourceVariable} does not contain PEM data. Expected a "-----BEGIN ..." block.`);
  }

  return material;
}

/** True when the operator asked for TLS, regardless of whether the material is valid. */
export function isNovuTlsEnabled(): boolean {
  return parseBooleanString(process.env.NOVU_TLS_ENABLED);
}

function assertEnterpriseSelfHosted(): void {
  if (!parseBooleanString(process.env.NOVU_ENTERPRISE) || !parseBooleanString(process.env.IS_SELF_HOSTED)) {
    throw new Error(
      'NOVU_TLS_ENABLED is only supported on enterprise self-hosted deployments. Set NOVU_ENTERPRISE=true and IS_SELF_HOSTED=true, or unset NOVU_TLS_ENABLED.'
    );
  }
}

/**
 * Reads and validates the TLS material. Returns `undefined` when TLS is disabled so
 * callers can skip `httpsOptions` entirely and keep the current HTTP listener.
 *
 * Throws on a half-configured deployment rather than silently serving plaintext.
 */
export function loadNovuTlsConfig(): NovuTlsConfig | undefined {
  if (!isNovuTlsEnabled()) {
    return undefined;
  }

  assertEnterpriseSelfHosted();

  if (typeof tls.getCACertificates !== 'function') {
    throw new Error(
      `NOVU_TLS_ENABLED requires tls.getCACertificates (Node 22.15 or newer). Running on ${process.version}.`
    );
  }

  const cert = readMaterial('NOVU_TLS_CERT');
  const key = readMaterial('NOVU_TLS_KEY');
  const ca = readMaterial('NOVU_TLS_CA');
  const passphrase = process.env.NOVU_TLS_KEY_PASSPHRASE || undefined;

  /*
   * Fail at boot instead of on the first TLS handshake: createSecureContext is what
   * the HTTP server would use anyway, so it catches a malformed PEM or a key that
   * does not match the certificate while the error can still name the variable.
   */
  try {
    tls.createSecureContext({ cert, key, passphrase });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';

    throw new Error(`NOVU_TLS_CERT and NOVU_TLS_KEY could not be loaded as a TLS key pair: ${reason}`);
  }

  return { cert, key, ca, passphrase };
}

let serviceCaCache: { source: string; bundle: string[] } | undefined;

/**
 * CA bundle for requests whose destination Novu builds from its own configuration
 * (preview loopback, API_INTERNAL_ORIGIN, API_ROOT_URL). Returns `undefined` when
 * TLS is off. Never pass it for tenant-controlled URLs: the private CA must not be
 * able to vouch for provider APIs, webhooks, or external bridges.
 *
 * The default store is included because API_ROOT_URL may sit behind an ingress
 * with a publicly issued certificate.
 */
export function getNovuServiceCa(): string[] | undefined {
  if (!isNovuTlsEnabled()) {
    return undefined;
  }

  const source = `${process.env.NOVU_TLS_CA_BASE64 ?? ''}\n${process.env.NOVU_TLS_CA_FILE ?? ''}`;
  if (serviceCaCache?.source !== source) {
    serviceCaCache = { source, bundle: [...tls.getCACertificates('default'), readMaterial('NOVU_TLS_CA')] };
  }

  return serviceCaCache.bundle;
}

/**
 * The API calls itself back for workflow previews, on `https://localhost` unless
 * `API_INTERNAL_ORIGIN` is set, and that call verifies the certificate. A
 * certificate scoped to the public hostname would otherwise fail every preview at
 * runtime, so the API checks this at boot.
 */
export function assertNovuTlsCoversLoopback(config: NovuTlsConfig): void {
  if (process.env.API_INTERNAL_ORIGIN) {
    return;
  }

  if (new X509Certificate(config.cert).checkHost('localhost')) {
    return;
  }

  throw new Error(
    'NOVU_TLS_CERT does not cover localhost, which the API calls itself on for workflow previews. Add DNS:localhost to the certificate subjectAltName, or set API_INTERNAL_ORIGIN to an https origin the certificate covers.'
  );
}

/**
 * Listener options for `NestFactory.create({ httpsOptions })`. The CA is left out
 * on purpose: passing it server-side asks the server to verify client
 * certificates, and this feature terminates one-way TLS rather than mTLS.
 */
export function toNovuTlsServerOptions(config: NovuTlsConfig): {
  cert: string;
  key: string;
  passphrase?: string;
} {
  return { cert: config.cert, key: config.key, passphrase: config.passphrase };
}
