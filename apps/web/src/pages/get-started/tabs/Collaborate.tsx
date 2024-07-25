import { Button } from '@mantine/core';
import { css } from '@novu/novui/css';
import { IconGroupAdd } from '@novu/novui/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';

import { TextElement } from '../TextElement';

export const collaborateSteps = [
  {
    title: 'Invite your team',
    content: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const navigate = useNavigate();

      return (
        <>
          <TextElement>
            Once your changes deployed to the Development environment, you can invite your technical and non-technical
            peers to collaborate with you.
          </TextElement>
          <Button
            leftIcon={<IconGroupAdd />}
            size="sm"
            onClick={() => {
              navigate(ROUTES.TEAM_SETTINGS);
            }}
            classNames={{
              root: css({
                marginTop: '12px !important',
                backgroundColor: '#292933 !important',
                borderRadius: '6px !important',
              }),
              label: css({
                fontSize: '14px !important',
              }),
              leftIcon: css({
                color: '#fff !important',
              }),
            }}
          >
            Invite team
          </Button>
        </>
      );
    },
  },
  {
    title: 'No-Code workflow modifications',
    content: () => (
      <TextElement>
        You can modify your workflow using the No-Code editor. You can also add new steps to your workflow.
      </TextElement>
    ),
  },
];
