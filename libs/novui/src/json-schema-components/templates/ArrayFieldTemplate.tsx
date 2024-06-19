import React from 'react';
import {
  ArrayFieldTitleProps,
  ArrayFieldTemplateProps,
  getTemplate,
  getUiOptions,
  ArrayFieldTemplateItemType,
} from '@rjsf/utils';
import { Grid } from '@mantine/core';
import { css } from '../../../styled-system/css';
import { Box, Flex, HStack } from '../../../styled-system/jsx';
import { Text } from '../../components';
import { formBorderClassName } from '../shared';

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { canAdd, disabled, idSchema, uiSchema, items, onAddClick, readonly, registry, required, title, schema } =
    props;
  const {
    ButtonTemplates: { AddButton },
  } = registry.templates;
  const uiOptions = getUiOptions(uiSchema);
  const ArrayFieldTitleTemplate = getTemplate('ArrayFieldTitleTemplate', registry, uiOptions);
  const ArrayFieldItemTemplate = getTemplate('ArrayFieldItemTemplate', registry, uiOptions);

  return (
    <Box>
      <ArrayFieldTitleTemplate
        idSchema={idSchema}
        title={uiOptions.title || title}
        schema={schema}
        uiSchema={uiSchema}
        required={required}
        registry={registry}
      />
      {items.map(({ key, ...itemProps }) => {
        return <ArrayFieldItemTemplate key={key} {...itemProps} />;
      })}
      {canAdd && <AddButton onClick={onAddClick} disabled={disabled || readonly} registry={registry} />}
    </Box>
  );
}

export function ArrayFieldTitleTemplate(props: ArrayFieldTitleProps) {
  const { title } = props;

  return (
    <Text py={'50'} fontWeight="strong">
      {title}
    </Text>
  );
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
    <Grid>
      <Grid.Col span={'auto'}>
        <div className={formBorderClassName}>{children}</div>
      </Grid.Col>
      <Grid.Col span={'content'}>
        <HStack gap="25" py="25">
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
      </Grid.Col>
    </Grid>
  );
}
