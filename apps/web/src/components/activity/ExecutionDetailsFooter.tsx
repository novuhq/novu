import { Grid } from '@mantine/core';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import { GotAQuestionButton } from '../utils/GotAQuestionButton';
import { colors, Text } from '../../design-system';
import { ArrowLeft } from '../../design-system/icons';

const LinkWrapper = styled.div`
  display: flex;
  justify-content: start;
  padding-top: 35px;
`;

const LinkText = styled(Text)`
  color: ${colors.B60};
  font-size: 14px;
  line-height: 17px;
  padding-left: 5px;
  padding-top: 3px;
`;

const ActionsWrapper = styled(LinkWrapper)`
  margin: 0;
  padding: 0;
`;

export const ExecutionDetailsFooter = ({ onClose, origin }) => {
  // TODO: Might be a good idea pass the name of the origin rather than the location path
  const linkText = `Back to ${origin.replace('/', '')}`;

  return (
    <Grid gutter={10}>
      <Grid.Col span={3}>
        <LinkWrapper>
          <ArrowLeft height={24} width={24} color={colors.B60} />
          <Link to={origin} onClick={onClose}>
            <LinkText>{linkText}</LinkText>
          </Link>
        </LinkWrapper>
      </Grid.Col>
      <Grid.Col span={2} offset={7}>
        <ActionsWrapper>
          {/* TODO: Button has a margin top that's not possible to overload */}
          <GotAQuestionButton mt={30} size="md" />
        </ActionsWrapper>
      </Grid.Col>
    </Grid>
  );
};
