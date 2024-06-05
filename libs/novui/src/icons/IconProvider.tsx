import { PropsWithChildren } from 'react';
import { IconContext } from 'react-icons';
import { DEFAULT_ICON_SIZE } from './Icon.const';
import { css } from '../../styled-system/css';

const iconClassName = css({
  verticalAlign: 'middle',
  color: 'typography.text.secondary',
});

export const IconProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <IconContext.Provider
      value={{
        size: DEFAULT_ICON_SIZE,
        className: iconClassName,
      }}
    >
      {children}
    </IconContext.Provider>
  );
};
