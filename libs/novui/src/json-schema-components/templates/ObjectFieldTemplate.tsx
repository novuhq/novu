import { ObjectFieldTemplateProps } from '@rjsf/utils';
import { Box } from '../../../styled-system/jsx';
import { jsonSchemaFormSection } from '../../../styled-system/recipes';
import { FormGroupTitle, SectionTitleToggle } from '../shared';
import { calculateSectionDepth, getVariantFromDepth } from '../utils';
import { useExpandToggle } from '../useExpandToggle';

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const [isExpanded, toggleExpanded] = useExpandToggle();

  const sectionDepth = calculateSectionDepth({ sectionId: props.idSchema.$id });
  const depthVariant = getVariantFromDepth(sectionDepth);

  const sectionClassNames = jsonSchemaFormSection({
    depth: depthVariant,
  });

  return (
    <Box className={sectionClassNames.sectionRoot}>
      <SectionTitleToggle
        onToggle={toggleExpanded}
        isExpanded={isExpanded}
        sectionDepth={sectionDepth}
        sectionTitle={props.title ? <FormGroupTitle>{props.title}</FormGroupTitle> : undefined}
      ></SectionTitleToggle>
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
