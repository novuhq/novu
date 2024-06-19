import { ObjectFieldTemplateProps } from '@rjsf/utils';
import { ReactNode } from 'react';
import { Box, HStack } from '../../../styled-system/jsx';
import { formBorderClassName, FormGroupTitle } from '../shared';

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  return (
    <Box>
      <HStack justifyContent={'space-between'}>
        <FormGroupTitle>{props.title}</FormGroupTitle>
      </HStack>
      {props.properties.map((element) => (
        <Box className={formBorderClassName} key={element.name}>
          {element.content}
        </Box>
      ))}
    </Box>
  );
}

interface ExtendedObjectFieldTemplateProps {
  actions?: ReactNode;
}

export function extendObjectFieldTemplate({ actions }: ExtendedObjectFieldTemplateProps) {
  return function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
    return (
      <Box>
        <HStack justifyContent={'space-between'}>
          <FormGroupTitle>{props.title}</FormGroupTitle>
          {actions}
        </HStack>
        {props.properties.map((element) => (
          <Box className={formBorderClassName} key={element.name}>
            {element.content}
          </Box>
        ))}
      </Box>
    );
  };
}
