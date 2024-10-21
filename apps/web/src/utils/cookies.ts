import Cookies from 'js-cookie';

type LocationAttributes = {
  path?: string;
  domain?: string;
};

export function createCookieHandler(cookieName: string) {
  return {
    get() {
      return Cookies.get(cookieName);
    },

    set(newValue: string, options: Cookies.CookieAttributes = {}) {
      return Cookies.set(cookieName, newValue, options);
    },

    remove(locationAttributes?: LocationAttributes) {
      Cookies.remove(cookieName, locationAttributes);
    },

    getOnce(locationAttributes?: LocationAttributes) {
      const value = Cookies.get(cookieName);
      this.remove(locationAttributes);

      return value;
    },
  };
}

export const novuRedirectURLCookie = createCookieHandler('nv_redirect_url');

/*
 * TODO: Store the onboarding step in the cookie and resume the flow from that step on page reload.
 * For now we just store 1.
 */
export const novuOnboardedCookie = createCookieHandler('nv_onboarding_step');

export const hubspotCookie = createCookieHandler('hubspotutk');

const ONBOARDING_COOKIE_EXPIRY_DAYS = 10 * 365;

// Never expires! Well it does, in 10 years but you will change device or browser by then :)
export function setNovuOnboardingStepCookie() {
  return novuOnboardedCookie.set('1', {
    expires: ONBOARDING_COOKIE_EXPIRY_DAYS,
    sameSite: 'None',
    secure: window.location.protocol === 'https:',
  });
}
