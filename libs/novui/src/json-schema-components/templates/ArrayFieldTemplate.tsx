import {
  ArrayFieldTemplateItemType,
  ArrayFieldTemplateProps,
  ArrayFieldTitleProps,
  getTemplate,
  getUiOptions,
} from '@rjsf/utils';
import { css } from '../../../styled-system/css';
import { Box } from '../../../styled-system/jsx';
import { jsonSchemaFormArrayToolbar, jsonSchemaFormSection } from '../../../styled-system/recipes';
import { FormGroupTitle, SectionTitleToggle } from '../shared';
import { calculateSectionDepth, getVariantFromDepth } from '../utils';
import { useExpandToggle } from '../useExpandToggle';

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const [isExpanded, toggleExpanded] = useExpandToggle();

  const { canAdd, disabled, idSchema, uiSchema, items, onAddClick, readonly, registry, required, title, schema } =
    props;
  const {
    ButtonTemplates: { AddButton },
  } = registry.templates;
  const uiOptions = getUiOptions(uiSchema);
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const ArrayFieldTitleTemplate = getTemplate('ArrayFieldTitleTemplate', registry, uiOptions);
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const ArrayFieldItemTemplate = getTemplate('ArrayFieldItemTemplate', registry, uiOptions);

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
        sectionTitle={
          uiOptions.title || title ? (
            <ArrayFieldTitleTemplate
              idSchema={idSchema}
              title={uiOptions.title || title}
              schema={schema}
              uiSchema={uiSchema}
              required={required}
              registry={registry}
            />
          ) : undefined
        }
      />
      {isExpanded ? (
        <>
          {items.map(({ key, ...itemProps }) => {
            return <ArrayFieldItemTemplate key={key} {...itemProps} />;
          })}
          {canAdd && (
            <AddButton
              onClick={onAddClick}
              disabled={disabled || readonly}
              registry={registry}
              className={css({ mt: '150' })}
            />
          )}
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
    schema,
  } = props;
  const { MoveDownButton, MoveUpButton, RemoveButton } = registry.templates.ButtonTemplates;

  const toolbarClassNames = jsonSchemaFormArrayToolbar({
    itemType: typeof schema.type === 'object' ? schema.type[0] : schema.type,
  });

  return (
    <div className={toolbarClassNames.toolbarWrapper}>
      {children}
      <div role="toolbar" className={toolbarClassNames.toolbar}>
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
      </div>
    </div>
  );
}
