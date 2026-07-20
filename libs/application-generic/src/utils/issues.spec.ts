import { expect } from 'chai';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { processControlValuesBySchema } from './issues';

describe('processControlValuesBySchema', () => {
  it('should validate schemas using JSON Schema draft 2020-12', () => {
    const issues = processControlValuesBySchema({
      controlSchema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 1 },
        },
        required: ['subject'],
        additionalProperties: false,
      } as JSONSchemaDto,
      controlValues: {},
    });

    expect(issues.controls?.subject).to.have.lengthOf(1);
    expect(issues.controls?.subject?.[0].message).to.equal('Subject is required');
  });
});
