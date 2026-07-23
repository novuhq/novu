import { expect } from 'chai';
import { parseStepVariables } from './parse-step-variables';

describe('parseStepVariables', () => {
  it('should stop traversing deeply nested schemas to avoid stack overflow', () => {
    let schema: Record<string, unknown> = { type: 'string' };

    for (let index = 0; index < 20; index += 1) {
      schema = {
        type: 'object',
        properties: {
          nested: schema,
        },
      };
    }

    expect(() => parseStepVariables(schema as any)).to.not.throw();
    expect(parseStepVariables(schema as any).primitives).to.be.empty;
  });

  it('should stop traversing cyclic schemas via allOf to avoid stack overflow', () => {
    const schema: Record<string, unknown> = {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
    };
    schema.allOf = [schema];

    expect(() => parseStepVariables(schema as any)).to.not.throw();
    expect(parseStepVariables(schema as any).primitives.map((variable) => variable.name)).to.include('value');
  });

  it('should stop traversing self-referencing property schemas to avoid stack overflow', () => {
    const schema: Record<string, unknown> = {
      type: 'object',
      properties: {},
    };
    (schema.properties as Record<string, unknown>).child = schema;

    expect(() => parseStepVariables(schema as any)).to.not.throw();
  });
});
