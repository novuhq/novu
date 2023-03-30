import React, { useState } from 'react';
import { UnstyledButton } from '@mantine/core';
import styled from '@emotion/styled';
import { Text } from '../typography/text/Text';
import { useStyles } from './TemplateButton.styles';
import { colors } from '../config';
import { When } from '../../components/utils/When';
import { Drag } from '../icons/general/Drag';
import { useOutletContext } from 'react-router-dom';

interface IDragButtonProps {
  Icon: React.FC<any>;
  description: string;
  label: string;
}

export function DragButton({ description, label, Icon }: IDragButtonProps) {
  const { cx, classes, theme } = useStyles();
  const [hover, setHover] = useState(false);

  return (
    <>
      <Button
        type={'button'}
        sx={{
          background: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
          border: `1px dashed ${theme.colorScheme === 'dark' ? colors.B30 : colors.B80}`,
          height: description.length > 0 ? '75px' : '50px',
          position: 'relative',
        }}
        className={cx(classes.button, { [classes.active]: false })}
        onMouseEnter={() => {
          setHover(true);
        }}
        onMouseLeave={() => {
          setHover(false);
        }}
      >
        <When truthy={hover}>
          <Drag
            style={{
              position: 'absolute',
              left: -17,
              top: 15,
            }}
            color={colors.B80}
          />
        </When>
        <ButtonWrapper>
          <LeftContainerWrapper>
            <IconWrapper className={classes.linkIcon}>
              <Icon />
            </IconWrapper>
            <StyledContentWrapper>
              <Text weight="bold">{label}</Text>
              <When truthy={description}>
                <Text mt={3} color={colors.B60}>
                  {description}
                </Text>
              </When>
            </StyledContentWrapper>
          </LeftContainerWrapper>
        </ButtonWrapper>
      </Button>
    </>
  );
}

const IconWrapper = styled.div`
  padding-right: 15px;

  @media screen and (max-width: 1400px) {
    padding-right: 5px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const LeftContainerWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StyledContentWrapper = styled.div`
  padding-right: 10px;
`;

const Button: any = styled(UnstyledButton)`
  position: relative;
  margin-bottom: 0;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
