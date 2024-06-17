import { JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune } from '@novu/novui/icons';
import { FC } from 'react';

interface IWorkflowStepEditorInputsPanelProps {
  // TODO: Placeholder for real props
  placeholder?: never;
}
const schema: any = {
  type: 'object',
  title: 'Example form',
  definitions: {
    locations: {
      enum: ['New York', 'Amsterdam', 'Hong Kong'],
    },
  },
  properties: {
    checkbox: {
      type: 'boolean',
      title: 'Checkbox field',
      default: true,
    },
    text: {
      type: 'string',
      title: 'Text field',
      default: 'lorem ipsum',
    },
    stringFormats: {
      type: 'object',
      title: 'Simple object',
      properties: {
        country: {
          type: 'string',
          title: 'Country',
        },
        address: {
          type: 'string',
          title: 'Address',
        },
        location: {
          title: 'Location',
          $ref: '#/definitions/locations',
        },
      },
      required: ['address'],
    },
    strings: {
      type: 'array',
      title: 'Simple Array',
      description: 'This is a simple array of strings',
      items: {
        type: 'string',
        default: '11',
      },
      minItems: 1,
    },
    users: {
      type: 'array',
      title: 'Array of objects',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
            default: 'John Doe',
          },
          age: { type: 'integer', default: 22, title: 'Age' },
          birthday: {
            type: 'string',
            title: 'Birthday',
            pattern: '\\d{2}-\\d{1,2}',
          },
        },
        required: ['name'],
      },
      minItems: 1,
    },
  },
};
export const WorkflowStepEditorInputsPanel: FC<IWorkflowStepEditorInputsPanelProps> = ({}) => {
  return (
    <Tabs
      defaultValue="payload"
      tabConfigs={[
        {
          icon: <IconOutlineTune />,
          value: 'payload',
          label: 'Payload',
          content: <JsonSchemaForm schema={schema} formData={{}} />,
        },
        {
          icon: <IconOutlineEditNote />,
          value: 'step-inputs',
          label: 'Step inputs',
          content: <JsonSchemaForm schema={schema} formData={{}} />,
        },
      ]}
    />
  );
};
