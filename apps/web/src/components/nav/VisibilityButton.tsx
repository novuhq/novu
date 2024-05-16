import { IconVisibilityOff } from '@novu/design-system';
import { css } from '../../styled-system/css';

const buttonStyles = css({
  bg: 'transparent',
  transition: 'background 0.2s ease',
  _hover: {
    '& svg': {
      fill: 'typography.text.secondary',
    },
  },
  borderRadius: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: '200',
});

export interface IVisibilityButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export const VisibilityButton: React.FC<IVisibilityButtonProps> = ({ onClick, className }) => {
  return (
    <button className={`${buttonStyles}${className ? ` ${className}` : ''}`} onClick={onClick}>
      <IconVisibilityOff />
    </button>
  );
};
