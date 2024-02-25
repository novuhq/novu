import { PropsWithChildren } from 'react';
import { IconContext } from 'react-icons';
import { css } from '@emotion/react';
import { useMantineTheme } from '@mantine/core';
import { DEFAULT_ICON_SIZE } from './Icon.const';

const iconClassName = css`
  vertical-align: middle;
`;

export const IconProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const theme = useMantineTheme();

  return (
    <IconContext.Provider
      value={{
        color: theme.colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[8],
        size: DEFAULT_ICON_SIZE,
        className: iconClassName.name,
      }}
    >
      {children}
    </IconContext.Provider>
  );
};
