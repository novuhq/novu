import { useEffect } from 'react';
import { Center } from '@novu/novui/jsx';
import { Loader } from '@mantine/core';
import { colors } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { encodeBase64 } from './utils/base64';
import { StudioState } from './types';
import { useLocation } from 'react-router-dom';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

function buildBridgeURL(origin: string | null, tunnelPath: string) {
  if (!origin) {
    return '';
  }

  return new URL(tunnelPath, origin).href;
}

function buildStudioURL(state: StudioState) {
  const url = new URL(ROUTES.STUDIO, window.location.origin);
  url.searchParams.append('state', encodeBase64(state));

  return url.href;
}

function assertProtocol(url: URL | string | null) {
  if (!url) {
    return;
  }

  if (typeof url === 'string') {
    url = new URL(url);
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`Novu: "${url.protocol}" protocol from "${url}" is not allowed.`);
  }
}

export function LocalStudioAuthenticator() {
  const { currentUser, isUserLoading, redirectToLogin, currentOrganization } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const parsedSearchParams = new URLSearchParams(location.search);

    // Get the redirect URL of the Local Studio server
    const redirectURL = parsedSearchParams.get('redirect_url');

    if (!redirectURL) {
      throw new Error('Failed to load Local Studio: missing redirect_url parameter.');
    }

    // Convert it to a URL object
    const parsedRedirectURL = new URL(redirectURL);

    // Protect against XSS attacks via the javascript: pseudo protocol
    assertProtocol(parsedRedirectURL);

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

    if (!currentUser) {
      if (!isUserLoading) {
        return redirectToLogin(window.location.href);
      }

      return;
    }

    const state: StudioState = {
      local: true,
      testUser: {
        id: currentUser._id,
        emailAddress: currentUser.email || '',
      },
      localBridgeURL,
      tunnelBridgeURL,
      organizationName: currentOrganization?.name || '',
    };

    /*
     * Construct the final redirect URL pointing to the Local Studio server and add
     * the iframe src URL as a search param.
     */
    const finalRedirectURL = new URL(redirectURL);
    finalRedirectURL.searchParams.append('local_studio_url', buildStudioURL(state));

    // Redirect to Local Studio server
    window.location.href = finalRedirectURL.href;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return (
    <Center
      className={css({
        marginTop: '[4rem]',
      })}
    >
      <Loader color={colors.error} size={32} />
    </Center>
  );
}
