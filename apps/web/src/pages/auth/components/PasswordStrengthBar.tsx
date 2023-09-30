import PasswordStrength from 'react-password-strength-bar';
import { passwordConstraints } from '@novu/shared';

export function PasswordStrengthBar({ password }: { password: string }) {
  return <PasswordStrength password={password} minLength={passwordConstraints.minLength} />;
}
