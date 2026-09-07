import { describe, expect, it } from 'vitest';
import { toSentence } from './to-sentence';

describe('toSentence', () => {
  it('should return empty string for empty array', () => {
    expect(toSentence([])).toBe('');
  });

  it('should return empty string for non-array input', () => {
    expect(toSentence('not an array')).toBe('');
    expect(toSentence(null)).toBe('');
    expect(toSentence(undefined)).toBe('');
    expect(toSentence(123)).toBe('');
    expect(toSentence({})).toBe('');
  });

  it('should handle single item arrays', () => {
    expect(toSentence(['John'])).toBe('John');
  });

  it('should format two items with default connector', () => {
    expect(toSentence(['John', 'Josh'])).toBe('John and Josh');
  });

  it('should format three items with limit of 3 or more', () => {
    expect(toSentence(['John', 'Josh', 'Sarah'], '', 3)).toBe('John, Josh, and Sarah');
  });

  it('should use overflow suffix for arrays longer than the limit', () => {
    expect(toSentence(['John', 'Josh', 'Sarah', 'Alex'])).toBe('John, Josh, and 2 others');
    expect(toSentence(['John', 'Josh', 'Sarah', 'Alex', 'Emma'])).toBe('John, Josh, and 3 others');
  });

  it('should pluralize overflow suffix correctly', () => {
    expect(toSentence(['John', 'Josh', 'Sarah'], '', 2, 'other')).toBe('John, Josh, and 1 other');
    expect(toSentence(['John', 'Josh', 'Sarah', 'Alex'], '', 2, 'other')).toBe('John, Josh, and 2 others');
  });

  it('should use custom connectors when provided', () => {
    expect(toSentence(['John', 'Josh'], '', 2, 'other', ' + ', ' or ', ' & ')).toBe('John or Josh');
    expect(toSentence(['John', 'Josh', 'Sarah'], '', 2, 'other', ' + ', ' or ', ' & ')).toBe('John + Josh & 1 other');
  });

  it('should handle object arrays with keyPath', () => {
    const users = [
      { name: 'John', id: 1 },
      { name: 'Josh', id: 2 },
      { name: 'Sarah', id: 3 },
    ];

    expect(toSentence(users, 'name', 3)).toBe('John, Josh, and Sarah');
    expect(toSentence(users, 'id', 3)).toBe('1, 2, and 3');
  });

  it('should handle nested object properties via keyPath', () => {
    const users = [
      { profile: { name: 'John' }, id: 1 },
      { profile: { name: 'Josh' }, id: 2 },
      { profile: { name: 'Sarah' }, id: 3 },
    ];

    expect(toSentence(users, 'profile.name', 3)).toBe('John, Josh, and Sarah');
  });

  it('should return empty strings for invalid object properties', () => {
    const users = [{ name: 'John' }, { name: null }, { noName: 'Sarah' }];

    expect(toSentence(users, 'name', 3)).toBe('John, , and ');
  });

  it('should handle custom limit values', () => {
    const names = ['John', 'Josh', 'Sarah', 'Alex', 'Emma'];

    expect(toSentence(names, '', 1)).toBe('John and 4 others');
    expect(toSentence(names, '', 3)).toBe('John, Josh, Sarah, and 2 others');
    expect(toSentence(names, '', 5)).toBe('John, Josh, Sarah, Alex, and Emma');
  });
});
