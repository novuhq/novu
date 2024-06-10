import React from 'react';
import { ObjectFieldTemplateProps } from '@rjsf/utils';
import { Box, styled } from '../../../styled-system/jsx';
import { css } from '../../../styled-system/css';
import { title } from '../../../styled-system/recipes';

const Title = styled('h2', title);

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  return (
    <Box>
      <Title variant={'subsection'}>{props.title}</Title>
      {props.properties.map((element) => (
        <Box pl={'125'} key={element.name} className={css({ pl: '125' })}>
          {element.content}
        </Box>
      ))}
    </Box>
  );
}
