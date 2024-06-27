import { ROUTES } from '../../constants/routes';

export function isStudioRoute(path: string) {
  return path.includes('/studio');
}

export function isStudioOnboardingRoute(path: string) {
  return path.includes(ROUTES.STUDIO_ONBOARDING);
}
