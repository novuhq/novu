import { PasswordResetRequest } from './password-reset-request/password-reset-request.usecase';
import { UserRegister } from './register/user-register.usecase';
import { Login } from './login/login.usecase';
import { SwitchEnvironment } from './switch-environment/switch-environment.usecase';
import { SwitchOrganization } from './switch-organization/switch-organization.usecase';
import { PasswordReset } from './password-reset/password-reset.usecase';

export const USE_CASES = [
  //
  UserRegister,
  Login,
  SwitchEnvironment,
  SwitchOrganization,
  PasswordResetRequest,
  PasswordReset,
];
