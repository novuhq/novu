import { useState } from 'react';
import { Box, Group, Divider, Popover, Stack, Avatar as MAvatar } from '@mantine/core';
import {
  WarningFilled,
  InfoCircleFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  UpCircleFilled,
  QuestionCircleFilled,
} from '@ant-design/icons';
import { SystemAvatarIconEnum, IAvatarDetails, AvatarTypeEnum } from '@novu/shared';
import { colors, Input, Switch, Text, Tooltip } from '../../design-system';
import { Camera } from '../../design-system/icons/general/Camera';
import { Avatar } from '../../design-system/icons/general/Avatar';
import { AvatarWrapper, IconWrapper, useStyles } from './AvatarContainer.styles';

const systemIcons = [
  {
    icon: <WarningFilled />,
    type: SystemAvatarIconEnum.WARNING,
    bgColor: '#FFF000',
  },
  {
    icon: <InfoCircleFilled />,
    type: SystemAvatarIconEnum.INFO,
    bgColor: '#0000FF',
  },
  {
    icon: <UpCircleFilled />,
    type: SystemAvatarIconEnum.UP,
    bgColor: colors.B70,
  },
  {
    icon: <QuestionCircleFilled />,
    type: SystemAvatarIconEnum.QUESTION,
    bgColor: colors.B70,
  },
  {
    icon: <CheckCircleFilled />,
    type: SystemAvatarIconEnum.SUCCESS,
    bgColor: colors.success,
  },
  {
    icon: <CloseCircleFilled />,
    type: SystemAvatarIconEnum.ERROR,
    bgColor: colors.error,
  },
];

const AvatarContainer = ({ value, onChange }: { onChange: (data: any) => void; value: IAvatarDetails }) => {
  const [opened, setOpened] = useState(false);
  const [tooltipOpened, setTooltipOpened] = useState(() => {
    return value.type === AvatarTypeEnum.NONE;
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
    <>
      <Popover
        target={
          <Tooltip label={<TooltipLabel />} position="left" opened={tooltipOpened}>
            <AvatarWrapper onClick={handleAvatarPopover} dark={dark}>
              <RenderAvatar avatarDetails={value} />
            </AvatarWrapper>
          </Tooltip>
        }
        opened={opened}
        position="bottom"
        placement="start"
        withArrow
        classNames={{
          inner: classes.inner,
          target: classes.target,
          arrow: classes.arrow,
          body: classes.body,
          popover: classes.popover,
        }}
      >
        <Stack>
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
                checked={value.type === AvatarTypeEnum.USER}
                onChange={(event) =>
                  onChange({
                    type: event.currentTarget.checked ? AvatarTypeEnum.USER : AvatarTypeEnum.NONE,
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
            onChange={(event) =>
              onChange({
                data: event.target.value,
                type: event.target.value ? AvatarTypeEnum.SYSTEM_CUSTOM : AvatarTypeEnum.NONE,
              })
            }
            value={value.type === AvatarTypeEnum.SYSTEM_CUSTOM && value.data ? value.data : ''}
          />
          <Divider label={<Text color={colors.B60}>or choose a system avatar</Text>} labelPosition="center" />
          <Group position="left" spacing={20}>
            {systemIcons.map((icon) => (
              <IconWrapper
                bgColor={icon.bgColor}
                onClick={() =>
                  onChange({
                    type: AvatarTypeEnum.SYSTEM_ICON,
                    data: icon.type,
                  })
                }
                size={50}
              >
                <div>{icon.icon}</div>
              </IconWrapper>
            ))}
          </Group>
        </Stack>
      </Popover>
    </>
  );
};

function RenderAvatar({ avatarDetails }: { avatarDetails: IAvatarDetails }) {
  if (!avatarDetails.type || avatarDetails.type === AvatarTypeEnum.NONE) {
    return <Camera />;
  }

  if (avatarDetails.type === AvatarTypeEnum.USER) {
    return <Avatar />;
  }

  if (avatarDetails.type === AvatarTypeEnum.SYSTEM_CUSTOM && avatarDetails.data) {
    return <MAvatar src={avatarDetails.data} radius="xl" />;
  }

  if (avatarDetails.type === AvatarTypeEnum.SYSTEM_ICON) {
    const selectedIcon = systemIcons.filter((data) => data.type === avatarDetails.data);

    return selectedIcon.length > 0 ? (
      <IconWrapper size={40} bgColor={selectedIcon[0].bgColor}>
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
