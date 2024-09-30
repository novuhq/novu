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

export const eeAuthTokenCookie = createCookieHandler('__session');
