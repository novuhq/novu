import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { IconButton } from '@/components/primitives/icon-button';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

type CredentialVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  /** Accessible label prefix, e.g. "Firebase Cloud Messaging credentials". */
  ariaLabel: string;
};

export function CredentialVisibilityToggle({ visible, onToggle, ariaLabel }: CredentialVisibilityToggleProps) {
  const tooltip = visible ? 'Hide values' : 'Show values';

  return (
    <IconButton
      icon={visible ? RiEyeOffLine : RiEyeLine}
      size="2xs"
      className={iconButtonClassName}
      tooltip={tooltip}
      aria-label={`${visible ? 'Hide' : 'Show'} ${ariaLabel}`}
      aria-pressed={visible}
      onClick={onToggle}
    />
  );
}
