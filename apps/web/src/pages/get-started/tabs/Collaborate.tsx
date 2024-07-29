import { Button } from '@mantine/core';
import { Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconGroupAdd, IconOutlineMenuBook } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
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
            Once your changes deployed to the Development or Production environments, invite your technical and
            non-technical peers to collaborate with you.
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
        You can modify your workflow using the No-Code controls editor. Controls are created for each step in your
        workflow definition code, and later can be accessed and modified by anyone on your team.
        <img src={'/static/images/onboarding/collaborate-controls.png'} />
        <HStack gap="50" className={css({ color: 'typography.text.secondary', mt: '12px' })}>
          <IconOutlineMenuBook />
          <a href="https://docs.novu.co/concepts/controls" target={'_blank'}>
            Learn more on our docs
          </a>
        </HStack>
      </TextElement>
    ),
  },
];
