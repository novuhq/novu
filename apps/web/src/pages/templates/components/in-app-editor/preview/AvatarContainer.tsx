import { useState, Dispatch, SetStateAction } from 'react';
import { Box, Group, Divider, Popover, Stack, Avatar as MAvatar } from '@mantine/core';
import {
  WarningFilled,
  InfoCircleFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  UpCircleFilled,
  QuestionCircleFilled,
} from '@ant-design/icons';
import { useController } from 'react-hook-form';
import { SystemAvatarIconEnum, IActor, ActorTypeEnum } from '@novu/shared';

import { colors, Input, Switch, Text, Tooltip, Avatar, Camera } from '@novu/design-system';
import { AvatarWrapper, IconWrapper, useStyles } from './AvatarContainer.styles';
import { useStepFormPath } from '../../../hooks/useStepFormPath';

const MENU_CLICK_OUTSIDE_EVENTS = ['click', 'mousedown', 'touchstart'];

const systemIcons = [
  {
    icon: <WarningFilled />,
    type: SystemAvatarIconEnum.WARNING,
    iconColor: '#FFF000',
    containerBgColor: '#FFF00026',
  },
  {
    icon: <InfoCircleFilled />,
    type: SystemAvatarIconEnum.INFO,
    iconColor: '#0000FF',
    containerBgColor: '#0000FF26',
  },
  {
    icon: <UpCircleFilled />,
    type: SystemAvatarIconEnum.UP,
    iconColor: colors.B70,
    containerBgColor: `${colors.B70}26`,
  },
  {
    icon: <QuestionCircleFilled />,
    type: SystemAvatarIconEnum.QUESTION,
    iconColor: colors.B70,
    containerBgColor: `${colors.B70}26`,
  },
  {
    icon: <CheckCircleFilled />,
    type: SystemAvatarIconEnum.SUCCESS,
    iconColor: colors.success,
    containerBgColor: `${colors.success}26`,
  },
  {
    icon: <CloseCircleFilled />,
    type: SystemAvatarIconEnum.ERROR,
    iconColor: colors.error,
    containerBgColor: `${colors.error}26`,
  },
];

const AvatarContainer = ({
  opened,
  setOpened,
  readonly,
}: {
  opened: boolean;
  setOpened: Dispatch<SetStateAction<boolean>>;
  readonly: boolean;
}) => {
  const path = useStepFormPath();
  const {
    field: { value, onChange },
  } = useController({
    name: `${path}.template.actor` as any,
  });

  const [tooltipOpened, setTooltipOpened] = useState(() => {
    return value.type === ActorTypeEnum.NONE;
  });
  const [avatarURLInput, setAvatarURLInput] = useState(() => {
    return value.type === ActorTypeEnum.SYSTEM_CUSTOM && value.data ? value.data : '';
  });

  const { classes, theme } = useStyles();
  const dark = theme.colorScheme === 'dark';

  function handleAvatarPopover() {
    setOpened((prev) => !prev);
    if (tooltipOpened) {
      setTooltipOpened(false);
    }
  }

  return (
    <span style={{ position: 'relative' }}>
      <Popover
        opened={opened}
        position="right-start"
        withArrow
        classNames={classes}
        onClose={() => setOpened(false)}
        closeOnClickOutside
        clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
        withinPortal
        disabled={readonly}
      >
        <Popover.Target>
          <span>
            <Tooltip disabled={readonly} label={<TooltipLabel />} position="left" opened={tooltipOpened}>
              <AvatarWrapper
                data-test-id="choose-avatar-btn"
                onClick={handleAvatarPopover}
                dark={dark}
                readonly={readonly}
              >
                <RenderAvatar actor={value} />
              </AvatarWrapper>
            </Tooltip>
          </span>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack sx={{ width: '230px' }}>
            <Group align="center">
              <Box>
                <Avatar />
              </Box>
              <Box>
                <Text>User avatar</Text>
              </Box>
              <Box
                sx={{
                  marginLeft: 'auto',
                }}
              >
                <Switch
                  checked={value.type === ActorTypeEnum.USER}
                  onChange={(event) =>
                    onChange({
                      type: event.currentTarget.checked ? ActorTypeEnum.USER : ActorTypeEnum.NONE,
                      data: null,
                    })
                  }
                />
              </Box>
            </Group>
            <Divider label={<Text color={colors.B60}>Platform/System Avatars</Text>} labelPosition="left" />

            <Group align="center">
              <Box>
                <Camera />
              </Box>
              <Box>
                <Text>Enter Avatar's URL</Text>
              </Box>
            </Group>
            <Input
              placeholder="Enter Avatar's URL"
              onBlur={(event) =>
                onChange({
                  data: event.target.value,
                  type: event.target.value ? ActorTypeEnum.SYSTEM_CUSTOM : ActorTypeEnum.NONE,
                })
              }
              onChange={(event) => {
                setAvatarURLInput(event.target.value);
              }}
              value={avatarURLInput}
            />
            <Divider label={<Text color={colors.B60}>or choose a system avatar</Text>} labelPosition="center" />
            <Group position="center" spacing={20}>
              {systemIcons.map((icon) => (
                <IconWrapper
                  data-test-id={`avatar-icon-${icon.type}`}
                  iconColor={icon.iconColor}
                  containerBgColor={icon.containerBgColor}
                  onClick={() =>
                    onChange({
                      type: ActorTypeEnum.SYSTEM_ICON,
                      data: icon.type,
                    })
                  }
                  size={50}
                  key={icon.type}
                >
                  <div>{icon.icon}</div>
                </IconWrapper>
              ))}
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </span>
  );
};

function RenderAvatar({ actor }: { actor: IActor }) {
  if (!actor.type || actor.type === ActorTypeEnum.NONE) {
    return <Camera />;
  }

  if (actor.type === ActorTypeEnum.USER) {
    return <Avatar />;
  }

  if (actor.type === ActorTypeEnum.SYSTEM_CUSTOM && actor.data) {
    return <MAvatar src={actor.data} radius="xl" />;
  }

  if (actor.type === ActorTypeEnum.SYSTEM_ICON) {
    const selectedIcon = systemIcons.filter((data) => data.type === actor.data);

    return selectedIcon.length > 0 ? (
      <IconWrapper
        data-test-id={`avatar-icon-${selectedIcon[0].type}`}
        size={40}
        iconColor={selectedIcon[0].iconColor}
        containerBgColor={selectedIcon[0].containerBgColor}
      >
        {selectedIcon[0].icon}
      </IconWrapper>
    ) : (
      <Camera />
    );
  }

  return <Camera />;
}

function TooltipLabel() {
  return (
    <Stack spacing={8}>
      <Text weight="bold" gradient>
        SETUP AVATAR
      </Text>
      <Text>Click on the icon to setup avatar.</Text>
    </Stack>
  );
}

export default AvatarContainer;
