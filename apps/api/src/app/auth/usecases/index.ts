import { SwitchEnvironment, SwitchOrganization } from '@novu/application-generic';

import { PasswordResetRequest } from './password-reset-request/password-reset-request.usecase';
import { UserRegister } from './register/user-register.usecase';
import { Login } from './login/login.usecase';
import { PasswordReset } from './password-reset/password-reset.usecase';
import { UpdatePassword } from './update-password/update-password.usecase';

export const USE_CASES = [
  //
  UserRegister,
  Login,
  SwitchEnvironment,
  SwitchOrganization,
  PasswordResetRequest,
  PasswordReset,
  UpdatePassword,
];
