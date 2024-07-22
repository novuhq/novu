import { type AuthContextValue } from './AuthProvider';

const noop = () => {};
const asyncNoop = async () => {};

export const DEFAULT_AUTH_CONTEXT_VALUE: AuthContextValue = {
  isUserLoaded: false,
  isOrganizationLoaded: false,
  currentUser: undefined,
  currentOrganization: undefined,
  login: asyncNoop,
  logout: noop,
  redirectToLogin: noop,
  redirectToSignUp: noop,
  switchOrganization: asyncNoop,
  reloadOrganization: async () => ({}),
};
