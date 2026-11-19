export interface IApiKey {
  key: string;
  _userId: string;
  hash?: string;
  /** Set when the key was created before the revocation cutoff and should be replaced. */
  requiresRotation?: boolean;
}
