import { PasswordResetRequest } from './password-reset-request/password-reset-request.usecase';
import { UserRegister } from './register/user-register.usecase';
import { Login } from './login/login.usecase';
import { SwitchApplication } from './switch-application/switch-application.usecase';
import { SwitchOrganization } from './switch-organization/switch-organization.usecase';
import { PasswordReset } from './password-reset/password-reset.usecase';

export const USE_CASES = [
  //
  UserRegister,
  Login,
  SwitchApplication,
  SwitchOrganization,
  PasswordResetRequest,
  PasswordReset,
];
