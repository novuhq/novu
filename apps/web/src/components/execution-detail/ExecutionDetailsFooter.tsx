import { Group } from '@mantine/core';
import styled from '@emotion/styled';

import { GotAQuestionButton } from '../utils/GotAQuestionButton';
import { Container } from '@novu/design-system';

const ActionsWrapper = styled(Container)`
  margin: 0;
  padding: 0;
  box-shadow: none;
`;

export const ExecutionDetailsFooter = () => {
  return (
    <Group position="right">
      <ActionsWrapper>
        {/* TODO: Button has a margin top that's not possible to overload */}
        <GotAQuestionButton mt={30} size="md" />
      </ActionsWrapper>
    </Group>
  );
};
