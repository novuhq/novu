import styled from '@emotion/styled';
import { UnstyledButton } from '@mantine/core';
import React, { useState } from 'react';
import { When } from '../when';
import { colors } from '../config';
import { Drag } from '../icons/general/Drag';
import { useTemplateButtonStyles } from './TemplateButton.styles';

interface IDragButtonProps {
  Icon: React.FC<any>;
  description: string;
}

export function DragButton({ description, Icon }: IDragButtonProps) {
  const { classes, theme } = useTemplateButtonStyles();
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
          '&:hover': {
            cursor: 'grab',
          },
        }}
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
          <IconWrapper className={classes.linkIcon}>
            <Icon />
          </IconWrapper>
        </ButtonWrapper>
      </Button>
    </>
  );
}

const IconWrapper = styled.div`
  @media screen and (max-width: 1400px) {
    svg {
      width: 24px;
      height: 24px;
    }
  }
  margin-left: 0px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const Button: any = styled(UnstyledButton)`
  position: relative;
  margin-bottom: 0;
  width: 64px;
  @media screen and (max-width: 1400px) {
    padding: 5px;
  }
  text-align: center;
  border-radius: 7px;
  cursor: grab;
`;
