import { Handle, Position } from 'react-flow-renderer';

import { Button, colors, shadows, Text, Title } from '../../../design-system';
import { TurnOnGradient } from '../../../design-system/icons/gradient/TurnOnGradient';

import styled from '@emotion/styled';
import { createStyles, Group, Popover, Stack, useMantineColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Playground } from '../../../design-system/icons/general/Playground';
import { NodeStep } from '../common';

const useStyles = createStyles((theme) => ({
  dropdown: {
    padding: 24,
    maxHeight: 196,
    borderRadius: 7,
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
    border: 'none',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B30 : colors.white,
  },
  arrow: {
    backgroundColor: theme.colorScheme === 'dark' ? colors.B30 : colors.white,
    border: 'none',
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
  },
}));

export function TriggerNode({ data }: { data: { label: string; email?: string } }) {
  const { framework } = useParams();

  return (
    <NodeStep
      data={data}
      Icon={TurnOnGradient}
      ActionItem={!framework && <TriggerPopover />}
      Handlers={() => {
        return (
          <>
            <Handle type="source" id="a" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
}

function TriggerPopover() {
  const [opened, setOpened] = useState(false);

  const { classes } = useStyles();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOpened(true);
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Popover
      withArrow
      withinPortal
      transition="rotate-left"
      transitionDuration={300}
      opened={opened}
      position="right"
      width={400}
      classNames={{
        dropdown: classes.dropdown,
        arrow: classes.arrow,
      }}
    >
      <Popover.Target>
        <div>
          <Button variant="outline" onClick={() => {}}>
            Run Trigger
          </Button>
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <PopoverContent setOpened={setOpened} />
      </Popover.Dropdown>
    </Popover>
  );
}

function PopoverContent({ setOpened }: { setOpened: (opened: boolean) => void }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? colors.B80 : colors.B70;
  const fillColor = isDark ? colors.B40 : colors.B70;

  return (
    <ContentWrapper>
      <Stack>
        <Group align="center" noWrap>
          <div>
            <Playground fill={fillColor} />
          </div>
          <Stack spacing={8}>
            <Title size={2}>Trigger a Notification!</Title>
            <Text rows={3} size="lg" color={textColor}>
              Run a trigger as if it was sent from your API and see how it might work in your app!
            </Text>
          </Stack>
        </Group>
        <Group position="right">
          <Button
            variant="gradient"
            onClick={() => {
              setOpened(false);
            }}
          >
            Got it
          </Button>
        </Group>
      </Stack>
    </ContentWrapper>
  );
}

const ContentWrapper = styled.div`
  max-width: 356px;
  max-height: 196px;
`;
