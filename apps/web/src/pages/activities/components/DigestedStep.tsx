import { Center, Grid, UnstyledButton } from '@mantine/core';
import { colors, Text } from '@novu/design-system';

export const DigestedStep = ({ digestedId, span = 4, onClick }) => {
  return (
    <Grid.Col
      span={span}
      sx={{
        padding: 0,
        paddingLeft: '10px',
        height: '100%',
      }}
    >
      <Center mt={20}>
        <Text align="center" mr={10} size="md" color={colors.B60}>
          Remaining execution has been merged to an active Digest.
        </Text>
      </Center>
      <Center mt={10}>
        <UnstyledButton
          component="span"
          onClick={(event) => {
            event.stopPropagation();
            onClick(event, digestedId);
          }}
        >
          <Text gradient>View Digest Execution</Text>
        </UnstyledButton>
      </Center>
    </Grid.Col>
  );
};
