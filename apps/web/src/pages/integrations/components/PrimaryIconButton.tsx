import styled from '@emotion/styled';
import { Group, UnstyledButton, Text, Title, useMantineTheme, Modal } from '@mantine/core';
import { colors } from '@novu/notification-center';
import { useState } from 'react';
import { When } from '../../../components/utils/When';
import { shadows, Tooltip, Button } from '../../../design-system';
import { RemoveCondition, StarEmpty, Warning } from '../../../design-system/icons';

const IconButton = styled(Group)`
  text-align: center;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B30)};

  &:hover {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B85)};
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B30)};
  }
`;

const RemovesCondition = () => {
  return (
    <Text mt={4} lineClamp={3} color="#EAA900">
      This action remove
      <br /> applied conditions
      <br />
      Learn more...
    </Text>
  );
};

export const PrimaryIconButton = ({
  conditions,
  primary = false,
  onClick,
}: {
  conditions?: any[];
  primary?: boolean;
  onClick: () => void;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const theme = useMantineTheme();

  if (primary) {
    return null;
  }

  return (
    <>
      <Tooltip
        label={
          <>
            Mark as Primary
            <When truthy={conditions && conditions.length > 0}>
              <RemovesCondition />
            </When>
          </>
        }
        position="bottom"
      >
        <UnstyledButton
          onClick={() => {
            if (conditions && conditions.length > 0) {
              setModalOpen(true);

              return;
            }
            onClick();
          }}
        >
          <IconButton position="center" spacing={4}>
            <StarEmpty />
          </IconButton>
        </UnstyledButton>
      </Tooltip>
      <Modal
        opened={modalOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          },
          body: {
            paddingTop: '5px',
            paddingInline: '8px',
          },
        }}
        title={
          <Group spacing={8}>
            <Warning color="#EAA900" />
            <Title color="#EAA900">Conditions will be removed</Title>
          </Group>
        }
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          setModalOpen(false);
        }}
        centered
        overflow="inside"
      >
        <Text color={colors.B60}>
          Marking this instance as primary will remove all conditions since primary instances cannot have any
          conditions.
        </Text>
        <Group mt={30} position="right">
          <Button
            variant="outline"
            onClick={() => {
              setModalOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClick();
              setModalOpen(false);
            }}
          >
            <Group spacing={8}>
              <RemoveCondition /> Remove conditions
            </Group>
          </Button>
        </Group>
      </Modal>
    </>
  );
};
