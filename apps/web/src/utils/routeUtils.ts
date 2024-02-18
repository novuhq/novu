import {
  AUTH_INVITATION_TOKEN_TYPE,
  AUTH_RESET_TOKEN_TYPE,
  TEMPLATES_EDIT_TEMPLATEID_TYPE,
} from '../constants/routeParams';

type URLParams = AUTH_INVITATION_TOKEN_TYPE | AUTH_RESET_TOKEN_TYPE | TEMPLATES_EDIT_TEMPLATEID_TYPE;

const escapeRegExp = (string: string) => string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');

export const parseUrl = (urlToParse: string, params: URLParams | Record<string, string>) => {
  return Object.keys(params).reduce((url, name) => {
    const value = params[name];

    return url.replace(new RegExp(`:${escapeRegExp(name)}`, 'g'), encodeURIComponent(String(value)));
  }, urlToParse);
};
