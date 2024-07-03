import { CreateUser } from '@novu/application-generic';

import { GetMyProfileUsecase } from './get-my-profile/get-my-profile.usecase';
import { UpdateOnBoardingUsecase } from './update-on-boarding/update-on-boarding.usecase';
import { UpdateOnBoardingTourUsecase } from './update-on-boarding-tour/update-on-boarding-tour.usecase';
import { UpdateProfileEmail } from './update-profile-email/update-profile-email.usecase';
import { UpdateNameAndProfilePicture } from './update-name-and-profile-picture/update-name-and-profile-picture.usecase';
import { SyncExternalUser } from './sync-external-user/sync-external-user.usecase';

function getEnterpriseUsecases() {
  if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
    return [SyncExternalUser];
  }

  return [];
}

export const USE_CASES = [
  CreateUser,
  GetMyProfileUsecase,
  UpdateOnBoardingUsecase,
  UpdateProfileEmail,
  UpdateOnBoardingTourUsecase,
  UpdateNameAndProfilePicture,
  ...getEnterpriseUsecases(),
];
