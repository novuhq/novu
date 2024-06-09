import {
  ArrayFieldTitleProps,
  ArrayFieldTemplateProps,
  getTemplate,
  getUiOptions,
  ArrayFieldTemplateItemType,
} from '@rjsf/utils';
import { Grid, Button } from '@mantine/core';
import { css } from '../../../styled-system/css';
import React from 'react';
import { Box, Flex, GridItem, HStack, styled } from '../../../styled-system/jsx';
import { title } from '../../../styled-system/recipes';

const Title = styled('h2', title);

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
    <Title py={'75'} variant={'subsection'}>
      {title}
    </Title>
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
    <Grid key={index}>
      <Grid.Col span={'auto'}>
        <div className={css({ pl: '125' })}>{children}</div>
      </Grid.Col>
      <Grid.Col span={'content'}>
        <Flex>
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
        </Flex>
      </Grid.Col>
    </Grid>
  );
  // return (
  //   <Grid columns={12} key={index}>
  //     <GridItem colStart={1} colEnd={12}>
  //       <div className={css({ px: '125' })}>{children}</div>
  //     </GridItem>
  //     <GridItem colSpan={1} colStart={12}>
  //       <Button.Group>
  //         {(hasMoveUp || hasMoveDown) && (
  //           <MoveUpButton
  //             disabled={disabled || readonly || !hasMoveUp}
  //             onClick={onReorderClick(index, index - 1)}
  //             // style={BTN_STYLE}
  //             // uiSchema={uiSchema}
  //             registry={registry}
  //           />
  //         )}
  //         {(hasMoveUp || hasMoveDown) && (
  //           <MoveDownButton
  //             disabled={disabled || readonly || !hasMoveDown}
  //             onClick={onReorderClick(index, index + 1)}
  //             // style={BTN_STYLE}
  //             // uiSchema={uiSchema}
  //             registry={registry}
  //           />
  //         )}
  //         {hasRemove && (
  //           <RemoveButton
  //             disabled={disabled || readonly}
  //             onClick={onDropIndexClick(index)}
  //             // uiSchema={uiSchema}
  //             registry={registry}
  //           />
  //         )}
  //       </Button.Group>
  //     </GridItem>
  //   </Grid>
  // );
}
