import { CreateUser } from './create-user/create-user.usecase';
import { GetMyProfileUsecase } from './get-my-profile/get-my-profile.usecase';
import { UpdateOnBoardingUsecase } from './update-on-boarding/update-on-boarding.usecase';

export const USE_CASES = [CreateUser, GetMyProfileUsecase, UpdateOnBoardingUsecase];
