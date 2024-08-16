import { Group } from '@mantine/core';
import { colors, useColorScheme } from '@novu/design-system';
import { Button, Text } from '@novu/novui';
import { useNavigate } from 'react-router-dom';
import { useSegment } from '../../../providers/SegmentProvider';

export function SampleModeBanner() {
  const { colorScheme } = useColorScheme();
  const navigate = useNavigate();
  const segment = useSegment();

  return (
    <div
      style={{
        width: '100%',
        padding: 8,
        backgroundColor: colorScheme === 'dark' ? '#13131A' : 'rgb(230 231 255)',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <Group spacing={24}>
        <Group spacing={8}>
          <Text color={colors.black}>
            You are currently viewing demo workflows. Add your own by completing the setup.
          </Text>
        </Group>
        <Group spacing={20}>
          <Button
            onClick={() => {
              segment.track('Sample Mode Banner Click');
              navigate('/get-started');
            }}
            size="sm"
            variant="transparent"
          >
            Complete Setup
          </Button>
        </Group>
      </Group>
    </div>
  );
}
