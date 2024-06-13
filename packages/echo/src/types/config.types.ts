export type ClientOptions = {
  /**
   * Specify your Novu API key, to secure your Bridge API endpoint.
   * Novu communicates securely with your endpoint using a signed HMAC header,
   * ensuring that only trusted requests from Novu are actioned by your Bridge API.
   * The API key is used to sign the HMAC header.
   */
  apiKey?: string;
  /**
   * Specify a custom Novu API URL.
   * Defaults to 'https://api.novu.co'
   */
  backendUrl?: string;
  /**
   * Explicitly bypass HMAC signature verification in dev mode.
   * Setting this to `true` will enable Novu to communicate with your Bridge API
   * without requiring a valid HMAC signature.
   * This is useful for local development and testing.
   *
   * You are strongly encouraged to specify an `apiKey` and set this to `false` in production,
   * to ensure that only trusted requests from Novu are actioned by your Bridge API.
   *
   * Defaults to false.
   */
  devModeBypassAuthentication?: boolean;
};
