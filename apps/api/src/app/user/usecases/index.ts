import { CreateUser } from './create-user/create-user.usecase';
import { GetMyProfileUsecase } from './get-my-profile/get-my-profile.usecase';
import { UpdateOnBoardingUsecase } from './update-on-boarding/update-on-boarding.usecase';
import { UpdateProfileEmail } from './update-profile-email/update-profile-email.usecase';

export const USE_CASES = [CreateUser, GetMyProfileUsecase, UpdateOnBoardingUsecase, UpdateProfileEmail];
