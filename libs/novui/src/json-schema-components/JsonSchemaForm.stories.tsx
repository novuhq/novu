import React, { FormEventHandler } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { RJSFSchema } from '@rjsf/utils';
import { JsonSchemaForm } from './JsonSchemaForm';
import { HStack } from '../../styled-system/jsx';
import { IconOutlineSave } from '../icons';
import { Title, Button } from '../components';
import { css } from '../../styled-system/css';

export default {
  title: 'Components/JsonSchemaForm',
  component: JsonSchemaForm,
  argTypes: {},
} as Meta<typeof JsonSchemaForm>;

const VARIABLES = [
  'ctrl.a',
  'ctrl.b',
  'ctrl.c',
  'ctrl.d',
  'ctrl.e',
  'payload.var',
  'payload.obj.var',
  'fakeAutocomplete.foo',
  'fakeAutocomplete.bar',
  'fakeAutocomplete.fizz',
  'fakeAutocomplete.buzz',
  'fakeAutocomplete.croissants',
  'fakeAutocomplete.olympics',
  'fakeAutocomplete.aReallyLongStringThatShouldOverflowFromTheContainer',
];

const Template: StoryFn<typeof JsonSchemaForm> = ({ colorPalette, ...args }) => {
  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    alert('Saving! (but not actually...)');
  };

  return (
    <form onSubmit={onSubmit} className={css({ colorPalette })}>
      <HStack justifyContent="space-between" mb="50">
        <Title variant="subsection">Step controls</Title>
        <Button type="submit" size="sm" Icon={IconOutlineSave}>
          Save
        </Button>
      </HStack>
      <JsonSchemaForm {...args} variables={VARIABLES} />
    </form>
  );
};
export const ExampleForm = Template.bind({});

const schema: RJSFSchema = {
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
          default: `Hello {{${VARIABLES[0]}}}, my name is {{invalid}} yo`,
        },
        address: {
          type: 'string',
          title: 'Address',
        },
        location: {
          title: 'Location',
          $ref: '#/definitions/locations',
        },
        anotherObject: {
          type: 'object',
          title: 'Nested example',
          properties: {
            isResidential: {
              type: 'boolean',
              title: 'Is residential?',
            },
            addressType: {
              type: 'string',
              title: 'Address type',
            },
            doubleNestedArray: {
              title: 'Double nested array',
              description: 'An array nested twice',
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: 1,
            },
          },
        },
      },
      required: ['address'],
    },
    strings: {
      type: 'array',
      title: 'Simple String Array',
      description: 'This is a simple string array',
      items: {
        type: 'string',
        default: 'a string indeed',
      },
      minItems: 1,
    },
    booleans: {
      type: 'array',
      title: 'Simple Boolean Array',
      description: 'This is a simple array',
      items: {
        type: 'boolean',
        default: true,
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

ExampleForm.args = {
  schema,
  formData: { money: 43 },
};

const MATCH_DESIGNS_SCHEMA: RJSFSchema = {
  type: 'object',
  title: 'Email content',
  properties: {
    TeamImage: {
      title: 'TeamImage',
      required: undefined,
      type: 'string',
      default: 'https://react-email-demo-bdj5iju9r-resend.vercel',
    },
    Text: {
      type: 'array',
      title: 'Text',
      minItems: 2,
      items: {
        title: 'InvitedByUsername',
        type: 'string',
      },
    },
    ShowFootage: {
      type: 'boolean',
      title: 'ShowFootage',
      default: true,
    },
  },
};

export const MatchDesigns = Template.bind({});
MatchDesigns.args = {
  schema: MATCH_DESIGNS_SCHEMA,
};

const ARRAY_DESIGNS_SCHEMA: RJSFSchema = {
  type: 'array',
  minItems: 2,
  items: {
    type: 'array',
    title: 'Phone numbers',
    minItems: 2,
    items: {
      type: 'object',
      title: 'Digits',
      properties: {
        strokes: {
          title: 'Strokes',
          type: 'array',
          minItems: 2,
          items: {
            type: 'integer',
          },
        },
      },
    },
  },
};

export const ArrayDesigns = Template.bind({});
ArrayDesigns.args = {
  schema: ARRAY_DESIGNS_SCHEMA,
};

const SIMPLE_AUTOCOMPLETE_SCHEMA: RJSFSchema = {
  type: 'object',
  title: 'Simple autocomplete',
  properties: {
    country: {
      type: 'string',
      title: 'Name',
      default: `Hello {{${VARIABLES[0]}}}, {{ ${VARIABLES[1]} | upcase }} {{invalidRef}} {{badSyntax`,
    },
  },
};

export const SimpleAutocomplete = Template.bind({});
SimpleAutocomplete.args = {
  schema: SIMPLE_AUTOCOMPLETE_SCHEMA,
};
