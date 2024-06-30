import validator from '@rjsf/validator-ajv8';
import Form from '@rjsf/core';
import React, { useEffect, useState } from 'react';
import { Stack } from '@mantine/core';

export const ControlVariables = ({ schema = {}, onChange = (values) => {}, defaults = {} }) => {
  const [values, setValues] = useState(defaults);

  useEffect(() => {
    if (Object.keys(values).length === 0) {
      return;
    }
    onChange(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  return (
    <>
      <style>
        {`fieldset {
        border: none;
      }
      
      .form-group.field.field-object{
      margin-top: 15px;
      }
      fieldset legend {
        display: block;
        font-size: 16px;
        margin-bottom: 5px;
      }
      
      fieldset label {
        margin-bottom: 10px;
        display: block;
      }
      
       fieldset input:not([type="checkbox"]), fieldset select {
    text-indent: 10px;
    font-family: Lato, sans serif;
    -webkit-tap-highlight-color: transparent;
    line-height: 35px;
    appearance: none;
    resize: none;
    box-sizing: border-box;
    font-size: 14px;
    width: 100%;
    display: block;
    text-align: left;
    padding-right: 14px;
    border-radius: 7px;
    border: 1px solid #3d3d4d;
    background-color: transparent;
    -webkit-transition: border-color 100ms ease;
    transition: border-color 100ms ease;
    border-radius: 7px;
    margin: 5px 0px;
  }
      .form-group {
        margin-bottom: 8px;
      }
      .control-label {
        margin-right: 8px;
        font-weight: bolder;
      }
      .checkbox input {
        margin-right: 8px;
      }
      .checkbox span {
        font-weight: bolder;
      }
      
      
      `}
      </style>
      <Stack spacing={0}>
        <Form
          schema={schema}
          validator={validator}
          onChange={(data) => {
            setValues(data.formData);
          }}
          templates={{ ButtonTemplates: { SubmitButton: () => null } }}
          formData={defaults}
        />
      </Stack>
    </>
  );
};
