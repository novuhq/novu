import { describe, expect, it } from 'vitest';
import { schemaChangeRejectsPreviousValues } from './use-changes-tree';

describe('schemaChangeRejectsPreviousValues', () => {
  it('treats an added type as a restriction when the previous schema allowed any value', () => {
    expect(schemaChangeRejectsPreviousValues({}, { type: 'string' })).toBe(true);
    expect(
      schemaChangeRejectsPreviousValues({ properties: { amount: {} } }, { properties: { amount: { type: 'string' } } })
    ).toBe(true);
  });

  it('does not treat a removed type as a restriction', () => {
    expect(schemaChangeRejectsPreviousValues({ type: 'string' }, {})).toBe(false);
  });

  it('does not mark an annotation-only property as breaking when extra fields are allowed', () => {
    expect(schemaChangeRejectsPreviousValues({}, { description: 'optional note' })).toBe(false);
    expect(
      schemaChangeRejectsPreviousValues(
        { type: 'object', additionalProperties: true },
        { type: 'object', additionalProperties: true, properties: { note: { description: 'optional note' } } }
      )
    ).toBe(false);
  });

  it('marks a new property as breaking when its schema rejects values extra fields used to accept', () => {
    expect(
      schemaChangeRejectsPreviousValues(
        { type: 'object', additionalProperties: true },
        { type: 'object', additionalProperties: true, properties: { amount: { type: 'string' } } }
      )
    ).toBe(true);
  });

  it('does not mark a new property as breaking when extra fields were already rejected', () => {
    expect(
      schemaChangeRejectsPreviousValues(
        { type: 'object', additionalProperties: false },
        { type: 'object', additionalProperties: false, properties: { amount: { type: 'string' } } }
      )
    ).toBe(false);
  });
});
