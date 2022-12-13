import PasswordStrength from 'react-password-strength-bar';
import { useWatch } from 'react-hook-form';
import { passwordConstraints } from '@novu/shared';

export function PasswordStrengthBar({ control }) {
  const password = useWatch({
    control,
    name: 'password',
  });

  return <PasswordStrength password={password} minLength={passwordConstraints.minLength} />;
}
