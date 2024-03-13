import styled from '@emotion/styled';
import { useMantineTheme } from '@mantine/core';
import { colors, IconOutlineSearchOff, Text } from '@novu/design-system';

const NoMatchesHolder = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 50vh;
`;

export const WorkflowListNoMatches = () => {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';

  return (
    <NoMatchesHolder data-test-id="workflows-no-matches">
      <IconOutlineSearchOff size={40} color={isDark ? colors.B40 : colors.B70} style={{ marginBottom: '1rem' }} />
      <Text color={isDark ? colors.B40 : colors.B70} size="lg">
        No matches found
      </Text>
      <Text color={isDark ? colors.B40 : colors.B70}>Try being less specific or using different keywords.</Text>
    </NoMatchesHolder>
  );
};
