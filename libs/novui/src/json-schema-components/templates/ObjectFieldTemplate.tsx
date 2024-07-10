import { ObjectFieldTemplateProps } from '@rjsf/utils';
import { Box } from '../../../styled-system/jsx';
import { jsonSchemaFormSection } from '../../../styled-system/recipes';
import { formItemClassName, FormGroupTitle, formItemRecipe } from '../shared';

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  console.log('Object props', props);

  return (
    <Box
      className={
        jsonSchemaFormSection({
          depth: calculateSectionDepth({ sectionId: props.idSchema.$id }) % 2 === 0 ? 'even' : 'odd',
        }).section
      }
    >
      <FormGroupTitle>{props.title}</FormGroupTitle>
      {props.properties.map((element) => (
        <Box className={formItemClassName} key={element.name}>
          {element.content}
        </Box>
      ))}
    </Box>
  );
}

function calculateSectionDepth({ sectionId }: { sectionId: string }): number {
  // FIXME: this is brittle
  return sectionId.split('_').length - 1;
}
