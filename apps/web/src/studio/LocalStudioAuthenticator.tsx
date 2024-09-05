import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, useEnvironment } from '../hooks';
import { ROUTES } from '../constants/routes';
import { assertProtocol } from '../utils/url';
import { encodeBase64 } from './utils/base64';
import { StudioState } from './types';
import { novuOnboardedCookie } from '../utils/cookies';
import { LocalStudioPageLayout } from '../components/layout/components/LocalStudioPageLayout';
import { getToken } from '../components/providers/AuthProvider';

function buildBridgeURL(origin: string | null, tunnelPath: string) {
  if (!origin) {
    return '';
  }

  return new URL(tunnelPath, origin).href;
}

function buildStudioURL(state: StudioState, defaultPath?: string | null) {
  const url = new URL(defaultPath || ROUTES.STUDIO, window.location.origin);
  url.searchParams.append('state', encodeBase64(state));

  return url.href;
}

export function LocalStudioAuthenticator() {
  const { currentUser, isUserLoaded, redirectToLogin, redirectToSignUp, currentOrganization, isOrganizationLoaded } =
    useAuth();
  const isLoading = !isUserLoaded && !isOrganizationLoaded;
  const location = useLocation();
  const { environments } = useEnvironment();
  const hasToken = !!getToken();

  // TODO: Refactor this to a smaller size function
  useEffect(() => {
    const parsedSearchParams = new URLSearchParams(location.search);
    const anonymousId = parsedSearchParams.get('anonymous_id');

    // Get the redirect URL of the Local Studio server
    const redirectURL = parsedSearchParams.get('redirect_url');

    if (!redirectURL) {
      throw new Error('Failed to load Local Studio: missing redirect_url parameter.');
    }

    // Convert it to a URL object
    const parsedRedirectURL = new URL(redirectURL);

    // Protect against XSS attacks via the javascript: pseudo protocol
    assertProtocol(parsedRedirectURL);

    // Parse the current URL, we will need it later
    const currentURL = new URL(window.location.href);

    // If the user is not logged in, redirect to the login or signup page
    if (!currentUser) {
      /*
       * If user is loading, wait for user to be loaded
       * We check for token here because on login we have a race condition
       * that is done with the loading and is missing a user but the auth token
       * is already present, the data just needs to refresh. Whe should investigate
       * why this race condition exists
       */
      if (!isLoading && !hasToken) {
        /*
         * If the user has logged in before, redirect to the login page.
         * After authentication, redirect back to the this /local-studio/auth path.
         */
        if (novuOnboardedCookie.get()) {
          return redirectToLogin({ redirectURL: window.location.href });
        }

        /*
         * If the user hasn't logged in before, redirect to the login page.
         * After authentication, redirect back to the this /local-studio/auth path and
         * remember that studio needs to be in onboarding mode.
         */
        return redirectToSignUp({ redirectURL: currentURL.href, origin: 'cli', anonymousId: anonymousId || undefined });
      }

      return;
    }

    // Wait for environments and apiKeys to be loaded
    if (!environments || environments?.length === 0) {
      return;
    }

    // Get the local application origin parameter
    const applicationOrigin = parsedSearchParams.get('application_origin');

    if (!applicationOrigin) {
      throw new Error('Failed to load Local Studio: missing application_origin parameter.');
    }

    const parsedApplicationOrigin = new URL(applicationOrigin);

    // Protect against XSS attacks via the javascript: pseudo protocol
    assertProtocol(parsedApplicationOrigin);

    // Get the optional tunnel origin parameter
    const tunnelOrigin = parsedSearchParams.get('tunnel_origin');
    const tunnelPath = parsedSearchParams.get('tunnel_route');
    if (!tunnelPath) {
      throw new Error('Tunnel Path is not defined');
    }

    // Protect against XSS attacks via the javascript: pseudo protocol
    assertProtocol(tunnelOrigin);

    // Build the state that will be passed to the Local Studio iframe

    const localBridgeURL = buildBridgeURL(parsedApplicationOrigin.origin, tunnelPath);
    const tunnelBridgeURL = buildBridgeURL(tunnelOrigin, tunnelPath);

    // TODO: Add apiKeys to the IEnvironment interface as they exist in the response

    // @ts-expect-error
    const devSecretKey = environments.find((env) => env.name.toLowerCase() === 'development')?.apiKeys[0]?.key;

    if (environments?.length > 0 && !devSecretKey) {
      throw new Error('Failed to load Local Studio: missing development environment secret key.');
    }

    const state: StudioState = {
      isLocalStudio: true,
      devSecretKey,
      testUser: {
        id: currentUser._id,
        emailAddress: currentUser.email || '',
      },
      localBridgeURL,
      tunnelBridgeURL,
      organizationName: currentOrganization?.name || '',
      anonymousId,
    };

    /*
     * Construct the final redirect URL pointing to the Local Studio server and add
     * the iframe src URL as a search param.
     */
    const finalRedirectURL = new URL(redirectURL);
    finalRedirectURL.searchParams.append(
      'local_studio_url',
      buildStudioURL(state, currentURL.searchParams.get('studio_path_hint'))
    );

    // Redirect to Local Studio server
    window.location.href = finalRedirectURL.href;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, environments, isLoading]);

  return <LocalStudioPageLayout.LoadingDisplay />;
}
