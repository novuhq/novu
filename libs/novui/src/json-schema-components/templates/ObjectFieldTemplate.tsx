import { ObjectFieldTemplateProps } from '@rjsf/utils';
import { Box } from '../../../styled-system/jsx';
import { jsonSchemaFormSection } from '../../../styled-system/recipes';
import {
  calculateSectionDepth,
  FormGroupTitle,
  getVariantFromDepth,
  SectionTitleToggle,
  useExpandToggle,
} from '../shared';

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const [isExpanded, toggleExpanded] = useExpandToggle();

  const depthVariant = getVariantFromDepth(calculateSectionDepth({ sectionId: props.idSchema.$id }));
  const sectionClassNames = jsonSchemaFormSection({
    depth: depthVariant,
  });

  return (
    <Box className={sectionClassNames.sectionRoot}>
      <SectionTitleToggle onToggle={toggleExpanded} isExpanded={isExpanded}>
        <FormGroupTitle>{props.title}</FormGroupTitle>
      </SectionTitleToggle>
      {isExpanded ? (
        <>
          {props.properties.map((element) => (
            <Box key={element.name}>{element.content}</Box>
          ))}
        </>
      ) : null}
    </Box>
  );
}
