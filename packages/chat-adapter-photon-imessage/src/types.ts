import type { Logger } from 'chat';

export interface PhotonImessageAdapterConfig {
  /** Spectrum Cloud project id (Basic auth username). */
  projectId: string;
  /** Spectrum Cloud project secret (Basic auth password). */
  projectSecret: string;
  /**
   * The signing secret Photon issued when the project webhook was registered.
   * Inbound deliveries are verified against the native Spectrum v0 scheme
   * (`X-Spectrum-Signature` / `X-Spectrum-Timestamp` headers) — requests
   * without a valid signature are rejected; the adapter fails closed.
   */
  webhookSecret: string;
  /** Bot display name. Defaults to `photon-imessage-agent`. */
  userName?: string;
  /** Optional logger override; defaults to a console logger. */
  logger?: Logger;
}
