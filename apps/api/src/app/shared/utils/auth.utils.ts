/**
 * Checks if the authorization header contains a keyless token
 * @param authorizationHeader - The authorization header value
 * @returns boolean indicating if the header contains a keyless token
 */
export function checkIsKeylessHeader(authorizationHeader: string | undefined): boolean {
  if (!authorizationHeader) {
    return false;
  }

  /*
   * 'authorization' header 'Keyless pk_keyless_<token>'
   * 'novu-application-identifier' header 'pk_keyless_<token>'
   */
  return authorizationHeader.includes('pk_keyless_');
}
