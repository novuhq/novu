import styled from '@emotion/styled';
import { Flex, Group, Overlay, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { colors, PencilOutlined, Text } from '@novu/design-system';
import { StepTypeEnum } from '@novu/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useBasePath } from '../../../../pages/templates/hooks/useBasePath';

export function PreviewEditOverlay() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const basePath = useBasePath();
  const { channel, stepUuid, variantUuid } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
    variantUuid: string;
  }>();

  const navigate = useNavigate();

  const handleEditMessage = () => {
    const isVariant = !!variantUuid;
    let path = `${basePath}/${channel}/${stepUuid}`;
    if (isVariant) {
      path += `/variants/${variantUuid}`;
    }

    navigate(path);
  };

  return (
    <OverlayStyled>
      <Flex onClick={handleEditMessage} align="center" justify="center" h="100%" style={{ cursor: 'pointer' }}>
        <UnstyledButton>
          <Group spacing={10} position="center" align="center" h="100%" noWrap>
            <PencilOutlined color={isDark ? colors.white : colors.B60} />
            <Text color={isDark ? colors.white : colors.B60} weight="bold">
              Edit message
            </Text>
          </Group>
        </UnstyledButton>
      </Flex>
    </OverlayStyled>
  );
}

const OverlayStyled = styled(Overlay)`
  border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.BGLight)};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? 'rgba(41, 41, 51, 0.8)' : 'rgba(255, 255, 255, 0.8)')};
`;
