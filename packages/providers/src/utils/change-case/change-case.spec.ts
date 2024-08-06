import {
  capitalCase,
  constantCase,
  dotCase,
  kebabCase,
  noCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
  trainCase,
} from './index';
const studPrimitiveObject = {
  primitiveString: 'string',
  primitiveNumber: 1,
  primitiveBoolean: true,
};

const stud = {
  ...studPrimitiveObject,
  listOfObjects: [studPrimitiveObject, studPrimitiveObject],
  nestedObject: {
    ...studPrimitiveObject,
    listOfObjects: [studPrimitiveObject, studPrimitiveObject],
  },
  listOfListOfObjects: [[studPrimitiveObject], [studPrimitiveObject]],
};

describe('change case', () => {
  it('should change case to capital case', () => {
    expect(capitalCase(stud)).toEqual({
      ListOfListOfObjects: [
        [
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
        ],
        [
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
        ],
      ],
      ListOfObjects: [
        {
          PrimitiveBoolean: true,
          PrimitiveNumber: 1,
          PrimitiveString: 'string',
        },
        {
          PrimitiveBoolean: true,
          PrimitiveNumber: 1,
          PrimitiveString: 'string',
        },
      ],
      NestedObject: {
        ListOfObjects: [
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
        ],
        PrimitiveBoolean: true,
        PrimitiveNumber: 1,
        PrimitiveString: 'string',
      },
      PrimitiveBoolean: true,
      PrimitiveNumber: 1,
      PrimitiveString: 'string',
    });
  });

  it('should change case to constant case', () => {
    expect(constantCase(stud)).toEqual({
      LIST_OF_LIST_OF_OBJECTS: [
        [
          {
            PRIMITIVE_BOOLEAN: true,
            PRIMITIVE_NUMBER: 1,
            PRIMITIVE_STRING: 'string',
          },
        ],
        [
          {
            PRIMITIVE_BOOLEAN: true,
            PRIMITIVE_NUMBER: 1,
            PRIMITIVE_STRING: 'string',
          },
        ],
      ],
      LIST_OF_OBJECTS: [
        {
          PRIMITIVE_BOOLEAN: true,
          PRIMITIVE_NUMBER: 1,
          PRIMITIVE_STRING: 'string',
        },
        {
          PRIMITIVE_BOOLEAN: true,
          PRIMITIVE_NUMBER: 1,
          PRIMITIVE_STRING: 'string',
        },
      ],
      NESTED_OBJECT: {
        LIST_OF_OBJECTS: [
          {
            PRIMITIVE_BOOLEAN: true,
            PRIMITIVE_NUMBER: 1,
            PRIMITIVE_STRING: 'string',
          },
          {
            PRIMITIVE_BOOLEAN: true,
            PRIMITIVE_NUMBER: 1,
            PRIMITIVE_STRING: 'string',
          },
        ],
        PRIMITIVE_BOOLEAN: true,
        PRIMITIVE_NUMBER: 1,
        PRIMITIVE_STRING: 'string',
      },
      PRIMITIVE_BOOLEAN: true,
      PRIMITIVE_NUMBER: 1,
      PRIMITIVE_STRING: 'string',
    });
  });

  it('should change case to dot case', () => {
    expect(dotCase(stud)).toEqual({
      'list.of.list.of.objects': [
        [
          {
            'primitive.boolean': true,
            'primitive.number': 1,
            'primitive.string': 'string',
          },
        ],
        [
          {
            'primitive.boolean': true,
            'primitive.number': 1,
            'primitive.string': 'string',
          },
        ],
      ],
      'list.of.objects': [
        {
          'primitive.boolean': true,
          'primitive.number': 1,
          'primitive.string': 'string',
        },
        {
          'primitive.boolean': true,
          'primitive.number': 1,
          'primitive.string': 'string',
        },
      ],
      'nested.object': {
        'list.of.objects': [
          {
            'primitive.boolean': true,
            'primitive.number': 1,
            'primitive.string': 'string',
          },
          {
            'primitive.boolean': true,
            'primitive.number': 1,
            'primitive.string': 'string',
          },
        ],
        'primitive.boolean': true,
        'primitive.number': 1,
        'primitive.string': 'string',
      },
      'primitive.boolean': true,
      'primitive.number': 1,
      'primitive.string': 'string',
    });
  });

  it('should change case to train case', () => {
    expect(trainCase(stud)).toEqual({
      'List-Of-List-Of-Objects': [
        [
          {
            'Primitive-Boolean': true,
            'Primitive-Number': 1,
            'Primitive-String': 'string',
          },
        ],
        [
          {
            'Primitive-Boolean': true,
            'Primitive-Number': 1,
            'Primitive-String': 'string',
          },
        ],
      ],
      'List-Of-Objects': [
        {
          'Primitive-Boolean': true,
          'Primitive-Number': 1,
          'Primitive-String': 'string',
        },
        {
          'Primitive-Boolean': true,
          'Primitive-Number': 1,
          'Primitive-String': 'string',
        },
      ],
      'Nested-Object': {
        'List-Of-Objects': [
          {
            'Primitive-Boolean': true,
            'Primitive-Number': 1,
            'Primitive-String': 'string',
          },
          {
            'Primitive-Boolean': true,
            'Primitive-Number': 1,
            'Primitive-String': 'string',
          },
        ],
        'Primitive-Boolean': true,
        'Primitive-Number': 1,
        'Primitive-String': 'string',
      },
      'Primitive-Boolean': true,
      'Primitive-Number': 1,
      'Primitive-String': 'string',
    });
  });

  it('should change case to no case', () => {
    expect(noCase(stud)).toEqual({
      'list of list of objects': [
        [
          {
            'primitive boolean': true,
            'primitive number': 1,
            'primitive string': 'string',
          },
        ],
        [
          {
            'primitive boolean': true,
            'primitive number': 1,
            'primitive string': 'string',
          },
        ],
      ],
      'list of objects': [
        {
          'primitive boolean': true,
          'primitive number': 1,
          'primitive string': 'string',
        },
        {
          'primitive boolean': true,
          'primitive number': 1,
          'primitive string': 'string',
        },
      ],
      'nested object': {
        'list of objects': [
          {
            'primitive boolean': true,
            'primitive number': 1,
            'primitive string': 'string',
          },
          {
            'primitive boolean': true,
            'primitive number': 1,
            'primitive string': 'string',
          },
        ],
        'primitive boolean': true,
        'primitive number': 1,
        'primitive string': 'string',
      },
      'primitive boolean': true,
      'primitive number': 1,
      'primitive string': 'string',
    });
  });

  it('should change case to kebab case', () => {
    expect(kebabCase(stud)).toEqual({
      'list-of-list-of-objects': [
        [
          {
            'primitive-boolean': true,
            'primitive-number': 1,
            'primitive-string': 'string',
          },
        ],
        [
          {
            'primitive-boolean': true,
            'primitive-number': 1,
            'primitive-string': 'string',
          },
        ],
      ],
      'list-of-objects': [
        {
          'primitive-boolean': true,
          'primitive-number': 1,
          'primitive-string': 'string',
        },
        {
          'primitive-boolean': true,
          'primitive-number': 1,
          'primitive-string': 'string',
        },
      ],
      'nested-object': {
        'list-of-objects': [
          {
            'primitive-boolean': true,
            'primitive-number': 1,
            'primitive-string': 'string',
          },
          {
            'primitive-boolean': true,
            'primitive-number': 1,
            'primitive-string': 'string',
          },
        ],
        'primitive-boolean': true,
        'primitive-number': 1,
        'primitive-string': 'string',
      },
      'primitive-boolean': true,
      'primitive-number': 1,
      'primitive-string': 'string',
    });
  });

  it('should change case to pascal case', () => {
    expect(pascalCase(stud)).toEqual({
      ListOfListOfObjects: [
        [
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
        ],
        [
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
        ],
      ],
      ListOfObjects: [
        {
          PrimitiveBoolean: true,
          PrimitiveNumber: 1,
          PrimitiveString: 'string',
        },
        {
          PrimitiveBoolean: true,
          PrimitiveNumber: 1,
          PrimitiveString: 'string',
        },
      ],
      NestedObject: {
        ListOfObjects: [
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
          {
            PrimitiveBoolean: true,
            PrimitiveNumber: 1,
            PrimitiveString: 'string',
          },
        ],
        PrimitiveBoolean: true,
        PrimitiveNumber: 1,
        PrimitiveString: 'string',
      },
      PrimitiveBoolean: true,
      PrimitiveNumber: 1,
      PrimitiveString: 'string',
    });
  });

  it('should change case to path case', () => {
    expect(pathCase(stud)).toEqual({
      'list/of/list/of/objects': [
        [
          {
            'primitive/boolean': true,
            'primitive/number': 1,
            'primitive/string': 'string',
          },
        ],
        [
          {
            'primitive/boolean': true,
            'primitive/number': 1,
            'primitive/string': 'string',
          },
        ],
      ],
      'list/of/objects': [
        {
          'primitive/boolean': true,
          'primitive/number': 1,
          'primitive/string': 'string',
        },
        {
          'primitive/boolean': true,
          'primitive/number': 1,
          'primitive/string': 'string',
        },
      ],
      'nested/object': {
        'list/of/objects': [
          {
            'primitive/boolean': true,
            'primitive/number': 1,
            'primitive/string': 'string',
          },
          {
            'primitive/boolean': true,
            'primitive/number': 1,
            'primitive/string': 'string',
          },
        ],
        'primitive/boolean': true,
        'primitive/number': 1,
        'primitive/string': 'string',
      },
      'primitive/boolean': true,
      'primitive/number': 1,
      'primitive/string': 'string',
    });
  });

  it('should change case to sentence case', () => {
    expect(sentenceCase(stud)).toEqual({
      Listoflistofobjects: [
        [
          {
            Primitiveboolean: true,
            Primitivenumber: 1,
            Primitivestring: 'string',
          },
        ],
        [
          {
            Primitiveboolean: true,
            Primitivenumber: 1,
            Primitivestring: 'string',
          },
        ],
      ],
      Listofobjects: [
        {
          Primitiveboolean: true,
          Primitivenumber: 1,
          Primitivestring: 'string',
        },
        {
          Primitiveboolean: true,
          Primitivenumber: 1,
          Primitivestring: 'string',
        },
      ],
      Nestedobject: {
        Listofobjects: [
          {
            Primitiveboolean: true,
            Primitivenumber: 1,
            Primitivestring: 'string',
          },
          {
            Primitiveboolean: true,
            Primitivenumber: 1,
            Primitivestring: 'string',
          },
        ],
        Primitiveboolean: true,
        Primitivenumber: 1,
        Primitivestring: 'string',
      },
      Primitiveboolean: true,
      Primitivenumber: 1,
      Primitivestring: 'string',
    });
  });

  it('should change case to snake case', () => {
    expect(snakeCase(stud)).toEqual({
      list_of_list_of_objects: [
        [
          {
            primitive_boolean: true,
            primitive_number: 1,
            primitive_string: 'string',
          },
        ],
        [
          {
            primitive_boolean: true,
            primitive_number: 1,
            primitive_string: 'string',
          },
        ],
      ],
      list_of_objects: [
        {
          primitive_boolean: true,
          primitive_number: 1,
          primitive_string: 'string',
        },
        {
          primitive_boolean: true,
          primitive_number: 1,
          primitive_string: 'string',
        },
      ],
      nested_object: {
        list_of_objects: [
          {
            primitive_boolean: true,
            primitive_number: 1,
            primitive_string: 'string',
          },
          {
            primitive_boolean: true,
            primitive_number: 1,
            primitive_string: 'string',
          },
        ],
        primitive_boolean: true,
        primitive_number: 1,
        primitive_string: 'string',
      },
      primitive_boolean: true,
      primitive_number: 1,
      primitive_string: 'string',
    });
  });
});
