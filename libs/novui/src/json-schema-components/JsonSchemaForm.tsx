import React from 'react';
import { RJSFSchema, ObjectFieldTemplateProps } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import Form from '@rjsf/core';

import { CheckboxWidget, SelectWidget, InputWidget } from './widgets';

import { styled } from 'styled-system/jsx';
import { title } from '../../styled-system/recipes';
import { css } from '../../styled-system/css';

import { AddButton, MoveDownButton, RemoveButton, MoveUpButton } from './templates/RemoveButton';
import { ArrayFieldItemTemplate, ArrayFieldTemplate, ArrayFieldTitleTemplate } from './templates/ArrayFieldTemplate';
const Title = styled('h2', title);

export const JsonSchemaForm = ({
  schema,
  formData,
  onChange,
}: {
  schema: RJSFSchema;
  formData: any;
  onChange?: (data: any) => void;
}) => {
  const widgets = {
    CheckboxWidget: CheckboxWidget,
    SelectWidget: SelectWidget,
    TextWidget: InputWidget,
  };
  const uiSchema = {
    'ui:globalOptions': { addable: true, copyable: false, label: true, hideError: true, orderable: true },
    'ui:options': {
      hideError: true,
      submitButtonOptions: {
        norender: true,
      },
    },
  };

  function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
    return (
      <div>
        <Title variant={'subsection'}>{props.title}</Title>
        {props.properties.map((element) => (
          <div key={element.name} className={css({ px: '125' })}>
            {element.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>
        {`
            .control-label {
              display: none;
            }
           
            `}
      </style>
      <Form
        uiSchema={uiSchema}
        schema={schema}
        formData={formData}
        widgets={widgets}
        validator={validator}
        onChange={({ formData }) => onChange && onChange(formData)}
        liveValidate={true}
        templates={{
          ArrayFieldTitleTemplate,
          ArrayFieldTemplate,
          ArrayFieldItemTemplate,
          ObjectFieldTemplate,
          ButtonTemplates: { MoveDownButton, AddButton, RemoveButton, MoveUpButton },
        }}
      />
    </>
  );
};
