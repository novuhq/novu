import { readFileSync } from 'node:fs';
import * as tls from 'node:tls';
import { parseBooleanString } from '../secrets-manager/secrets-manager.service';

/**
 * Opt-in end-to-end TLS for enterprise self-hosted images. Certificate material is
 * supplied through the environment (inline base64 or a mounted file) and fed to the
 * Nest HTTP server, while the private CA is appended to the Node trust store so
 * Novu services can verify each other.
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
 * `setDefaultCACertificates` landed in Node 22.19 and is missing from the
 * @types/node version this monorepo pins, so the signature is declared here.
 */
declare module 'node:tls' {
  function setDefaultCACertificates(certs: string[]): void;
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

  if (typeof tls.setDefaultCACertificates !== 'function') {
    throw new Error(
      `NOVU_TLS_ENABLED requires tls.setDefaultCACertificates (Node 22.19 or newer). Running on ${process.version}.`
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

/**
 * Appends the private CA to the Node trust store so every Node TLS client in the
 * process (got, axios, node:https) verifies Novu's own certificates without
 * per-call options. The public roots are preserved so outbound provider calls keep
 * working.
 *
 * Must run before the first HTTPS request, because the agent caches TLS sessions.
 */
export function applyNovuTlsTrust(config: NovuTlsConfig): void {
  tls.setDefaultCACertificates([...tls.getCACertificates('default'), config.ca]);
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
