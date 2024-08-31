import { useCallback } from 'react';
import { createCookieHandler } from '../utils/cookies';
import { assertProtocol } from '../utils/url';

const novuRedirectURLCookie = createCookieHandler('nv_redirect_url');

const REDIRECT_URL_SEARCH_PARAM = 'redirect_url';

const REDIRECT_COOKIE_EXPIRY_DAYS = 7;

export function useRedirectURL() {
  const setRedirectURL = useCallback(() => {
    const redirectURLFromParams = new URL(window.location.href).searchParams.get(REDIRECT_URL_SEARCH_PARAM) || '';

    // If there is a redirect URL in the URL, set it in the cookie.
    if (redirectURLFromParams) {
      // Protect against XSS attacks via the javascript: pseudo protocol.
      assertProtocol(redirectURLFromParams);
      // Expires in 7 days.
      novuRedirectURLCookie.set(redirectURLFromParams, { expires: REDIRECT_COOKIE_EXPIRY_DAYS });

      // Clean the URL so that the redirect URL doesn't get used again.
      const url = new URL(window.location.href);
      url.searchParams.delete(REDIRECT_URL_SEARCH_PARAM);
      window.history.replaceState({}, '', url.href);
    }
  }, []);

  const getRedirectURL = useCallback(() => {
    const redirectURLFromCookie = novuRedirectURLCookie.get();

    // If there is a cookie in the URL, redirect to that URL. Otherwise, its a noop.
    if (redirectURLFromCookie) {
      // Clean the cookie first, so that it doesn't get used again.
      novuRedirectURLCookie.remove();

      return redirectURLFromCookie;
    }

    return '';
  }, []);

  return {
    setRedirectURL,
    getRedirectURL,
  };
}
