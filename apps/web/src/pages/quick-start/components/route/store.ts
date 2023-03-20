import { ROUTES } from '../../../../constants/routes.enum';

export function currentOnboardingStep() {
  const LOCAL_STORAGE_STEP = 'onboarding-step';

  function localSet(path: string) {
    if (path.startsWith(ROUTES.GET_STARTED) || path.startsWith(ROUTES.QUICKSTART)) {
      localStorage.setItem(LOCAL_STORAGE_STEP, path);
    }
  }

  function localGet(): string | null {
    return localStorage.getItem(LOCAL_STORAGE_STEP);
  }

  return { get: localGet, set: localSet };
}
