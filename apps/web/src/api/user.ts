import { IUserEntity, IUpdateUserProfile } from '@novu/shared';

import { api } from './api.client';

export async function getUser() {
  return api.get('/v1/users/me');
}

export async function updateUserOnBoarding(showOnBoarding: boolean) {
  return api.put('/v1/users/onboarding', { showOnBoarding });
}

export async function updateUserOnBoardingTour(showOnBoardingTour: number) {
  return api.put('/v1/users/onboarding-tour', { showOnBoardingTour });
}

export async function updateUserProfile({
  firstName,
  lastName,
  profilePicture,
}: IUpdateUserProfile): Promise<IUserEntity> {
  return api.put('/v1/users/profile', { firstName, lastName, profilePicture });
}
