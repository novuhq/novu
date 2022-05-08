import { api } from './api.client';

export async function getUser() {
  return api.get('/v1/users/me');
}

export async function updateUserOnBoarding(showOnBoarding: boolean) {
  return api.put('/v1/users/onboarding', { showOnBoarding });
}
