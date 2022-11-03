import { useState } from 'react';
import {
  Box,
  Menu,
  ActionIcon,
  Group,
  Divider,
  Popover,
  List,
  useMantineColorScheme,
  Stack,
  Avatar as MAvatar,
} from '@mantine/core';
import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import {
  WarningFilled,
  InfoCircleFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  UpCircleFilled,
  QuestionCircleFilled,
} from '@ant-design/icons';
import { SystemAvatarIconEnum, IAvatarDetails, AvatarTypeEnum } from '@novu/shared';
import { colors, Dropdown, Input, Radio, Switch, Text } from '../../design-system';
import { Camera } from '../../design-system/icons/general/Camera';
import { Avatar } from '../../design-system/icons/general/Avatar';

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
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <>
      <Popover
        target={
          <AvatarWrapper onClick={() => setOpened((prev) => !prev)}>
            <ActionIcon>
              <RenderAvatar avatarDetails={value} />
            </ActionIcon>
          </AvatarWrapper>
        }
        opened={opened}
        position="bottom"
        placement="start"
        withArrow
        styles={{
          inner: { margin: 0, padding: 15 },
          target: { height: '40px' },
          arrow: {
            backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
            height: '-22px',
            border: 'none',
            margin: '0px',
          },
          body: {
            backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
            color: colorScheme === 'dark' ? colors.white : colors.B40,
            border: 'none',
            marginTop: '1px',
            width: '100%',
          },
          popover: { width: '240px' },
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

          <Group>
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

const AvatarWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${colors.B40};
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

const IconWrapper = styled.div<{ bgColor: string; size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: 50%;
  cursor: pointer;
  background-color: ${({ bgColor }) => `${bgColor}15`};
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  color: ${({ bgColor }) => bgColor};
`;

export default AvatarContainer;
