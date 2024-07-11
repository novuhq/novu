import {
  ArrayFieldTemplateItemType,
  ArrayFieldTemplateProps,
  ArrayFieldTitleProps,
  getTemplate,
  getUiOptions,
} from '@rjsf/utils';
import { css, cx } from '../../../styled-system/css';
import { Box, HStack } from '../../../styled-system/jsx';
import { jsonSchemaFormSection } from '../../../styled-system/recipes';
import {
  calculateSectionDepth,
  FormGroupTitle,
  getVariantFromDepth,
  SectionTitleToggle,
  useExpandToggle,
} from '../shared';

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const [isExpanded, toggleExpanded] = useExpandToggle();

  console.log('Array props', props);

  const { canAdd, disabled, idSchema, uiSchema, items, onAddClick, readonly, registry, required, title, schema } =
    props;
  const {
    ButtonTemplates: { AddButton },
  } = registry.templates;
  const uiOptions = getUiOptions(uiSchema);
  const ArrayFieldTitleTemplate = getTemplate('ArrayFieldTitleTemplate', registry, uiOptions);
  const ArrayFieldItemTemplate = getTemplate('ArrayFieldItemTemplate', registry, uiOptions);

  const depthVariant = getVariantFromDepth(calculateSectionDepth({ sectionId: props.idSchema.$id }));
  const sectionClassNames = jsonSchemaFormSection({
    depth: depthVariant,
  });

  return (
    <Box className={sectionClassNames.sectionRoot}>
      <SectionTitleToggle onToggle={toggleExpanded} isExpanded={isExpanded}>
        <ArrayFieldTitleTemplate
          idSchema={idSchema}
          title={uiOptions.title || title}
          schema={schema}
          uiSchema={uiSchema}
          required={required}
          registry={registry}
        />
      </SectionTitleToggle>
      {isExpanded ? (
        <>
          {items.map(({ key, ...itemProps }) => {
            return <ArrayFieldItemTemplate key={key} {...itemProps} />;
          })}
          {canAdd && <AddButton onClick={onAddClick} disabled={disabled || readonly} registry={registry} />}
        </>
      ) : null}
    </Box>
  );
}

export function ArrayFieldTitleTemplate({ title }: ArrayFieldTitleProps) {
  return <FormGroupTitle>{title}</FormGroupTitle>;
}

export function ArrayFieldItemTemplate(props: ArrayFieldTemplateItemType) {
  const {
    children,
    disabled,
    hasMoveDown,
    hasMoveUp,
    hasRemove,
    index,
    onDropIndexClick,
    onReorderClick,
    readonly,
    registry,
  } = props;
  const { MoveDownButton, MoveUpButton, RemoveButton } = registry.templates.ButtonTemplates;

  return (
    <HStack
      gap="50"
      // align the buttons with the input itself rather than centered with the input and its label
      className={cx(
        css({
          '&:has(input[type="text"],input[type="checkbox"],textarea[type="text"]) [role="toolbar"]': {
            paddingTop: '0',
            alignSelf: 'flex-start',
          },
        })
      )}
    >
      <div className={css({ width: 'full' })}>{children}</div>
      <HStack role="toolbar" gap="25" py="25">
        {(hasMoveUp || hasMoveDown) && (
          <MoveUpButton
            disabled={disabled || readonly || !hasMoveUp}
            onClick={onReorderClick(index, index - 1)}
            registry={registry}
          />
        )}
        {(hasMoveUp || hasMoveDown) && (
          <MoveDownButton
            disabled={disabled || readonly || !hasMoveDown}
            onClick={onReorderClick(index, index + 1)}
            registry={registry}
          />
        )}
        {hasRemove && (
          <RemoveButton disabled={disabled || readonly} onClick={onDropIndexClick(index)} registry={registry} />
        )}
      </HStack>
    </HStack>
  );
}
