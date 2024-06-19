import { ObjectFieldTemplateProps } from '@rjsf/utils';
import { Box } from '../../../styled-system/jsx';
import { formBorderClassName, FormGroupTitle } from '../shared';

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  return (
    <Box>
      <FormGroupTitle>{props.title}</FormGroupTitle>
      {props.properties.map((element) => (
        <Box className={formBorderClassName} key={element.name}>
          {element.content}
        </Box>
      ))}
    </Box>
  );
}
