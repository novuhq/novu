export const buildOauthRedirectUrl = (request): string => {
  let url = process.env.FRONT_BASE_URL + '/auth/login';

  if (!request.user || !request.user.token) {
    return `${url}?error=AuthenticationError`;
  }

  const redirectUrl = JSON.parse(request.query.state).redirectUrl;

  /**
   * Make sure we only allow localhost redirects for CLI use and our own success route
   * https://github.com/novuhq/novu/security/code-scanning/3
   */
  if (
    redirectUrl &&
    redirectUrl.startsWith('http://localhost:') &&
    !redirectUrl.includes('@')
  ) {
    url = redirectUrl;
  }

  url += `?token=${request.user.token}`;

  if (request.user.newUser) {
    url += '&newUser=true';
  }

  /**
   * partnerCode, next and configurationId are required during external partners integration
   * such as vercel integration etc
   */
  const partnerCode = JSON.parse(request.query.state).partnerCode;
  if (partnerCode) {
    url += `&code=${partnerCode}`;
  }

  const next = JSON.parse(request.query.state).next;
  if (next) {
    url += `&next=${next}`;
  }

  const configurationId = JSON.parse(request.query.state).configurationId;
  if (configurationId) {
    url += `&configurationId=${configurationId}`;
  }

  const invitationToken = JSON.parse(request.query.state).invitationToken;
  if (invitationToken) {
    url += `&invitationToken=${invitationToken}`;
  }

  return url;
};
