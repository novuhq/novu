import { Header } from '@mantine/core';
import { Text } from '@novu/novui';
import { IconOutlineArrowBack } from '@novu/novui/icons';
import { hstack } from '@novu/novui/patterns';
import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HEADER_NAV_HEIGHT } from '../constants';

export const LocalStudioHeader: FC = () => {
  const navigate = useNavigate();

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      className={hstack({
        position: 'sticky',
        top: 0,
        borderBottom: 'none !important',
        // TODO: fix when we re-do z-index across the app
        zIndex: 199,
        padding: '50',
        justifyContent: 'flex-start',
      })}
    >
      {/** TODO temporary back-button. To be refined later */}
      <button
        className={hstack({
          cursor: 'pointer',
          gap: 'margins.icons.Icon20-txt',
          px: '75',
          py: '25',
          _hover: { opacity: 'hover' },
        })}
        onClick={() => navigate(-1)}
      >
        <IconOutlineArrowBack />
        <Text fontWeight="strong" color="typography.text.secondary">
          Back
        </Text>
      </button>
    </Header>
  );
};
