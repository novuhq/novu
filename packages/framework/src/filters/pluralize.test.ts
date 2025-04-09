import { describe, it, expect } from 'vitest';
import { pluralize } from './pluralize';

describe('pluralize', () => {
  it('should return empty string for falsy values', () => {
    expect(pluralize(null)).toBe('');
    expect(pluralize(undefined)).toBe('');
  });

  it('should handle arrays and count their length', () => {
    expect(pluralize([], 'item')).toBe('0 items');
    expect(pluralize(['a'], 'item')).toBe('1 item');
    expect(pluralize(['a', 'b'], 'item')).toBe('2 items');
    expect(pluralize(['a', 'b', 'c'], 'item')).toBe('3 items');
  });

  it('should handle objects and count their keys', () => {
    expect(pluralize({}, 'property')).toBe('0 properties');
    expect(pluralize({ a: 1 }, 'property')).toBe('1 property');
    expect(pluralize({ a: 1, b: 2 }, 'property')).toBe('2 properties');
  });

  it('should convert string numbers to numeric values', () => {
    expect(pluralize('0', 'item')).toBe('0 items');
    expect(pluralize('1', 'item')).toBe('1 item');
    expect(pluralize('2', 'item')).toBe('2 items');
    expect(pluralize('10', 'item')).toBe('10 items');
    expect(pluralize('asdf', 'item')).toBe('0 items');
  });

  it('should handle numeric values directly', () => {
    expect(pluralize(0, 'item')).toBe('0 items');
    expect(pluralize(1, 'item')).toBe('1 item');
    expect(pluralize(2, 'item')).toBe('2 items');
    expect(pluralize(10, 'item')).toBe('10 items');
  });

  it('should handle other values by converting them to numbers', () => {
    expect(pluralize(true, 'item')).toBe('1 item');
    expect(pluralize(false, 'item')).toBe('0 items');
  });

  it('should handle NaN values by returning 0', () => {
    expect(pluralize(NaN, 'item')).toBe('0 items');
  });

  it('should handle custom plural forms when provided', () => {
    expect(pluralize(0, 'child', 'children')).toBe('0 children');
    expect(pluralize(1, 'child', 'children')).toBe('1 child');
    expect(pluralize(2, 'child', 'children')).toBe('2 children');

    expect(pluralize(0, 'person', 'people')).toBe('0 people');
    expect(pluralize(1, 'person', 'people')).toBe('1 person');
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
  });

  it('should use plur library for automatic pluralization when no custom plural is provided', () => {
    // Regular pluralization (adding 's')
    expect(pluralize(0, 'apple')).toBe('0 apples');
    expect(pluralize(1, 'apple')).toBe('1 apple');
    expect(pluralize(2, 'apple')).toBe('2 apples');

    // Words ending in 'y'
    expect(pluralize(0, 'berry')).toBe('0 berries');
    expect(pluralize(1, 'berry')).toBe('1 berry');
    expect(pluralize(2, 'berry')).toBe('2 berries');

    // Words ending in 'f' or 'fe'
    expect(pluralize(0, 'leaf')).toBe('0 leaves');
    expect(pluralize(1, 'leaf')).toBe('1 leaf');
    expect(pluralize(2, 'leaf')).toBe('2 leaves');

    // Irregular plurals
    expect(pluralize(0, 'child')).toBe('0 children');
    expect(pluralize(1, 'child')).toBe('1 child');
    expect(pluralize(2, 'child')).toBe('2 children');

    expect(pluralize(0, 'person')).toBe('0 people');
    expect(pluralize(1, 'person')).toBe('1 person');
    expect(pluralize(2, 'person')).toBe('2 people');
  });

  it('should handle decimal numbers', () => {
    expect(pluralize(1.5, 'apple')).toBe('1.5 apples');
    expect(pluralize(0.5, 'portion')).toBe('0.5 portions');
  });

  it('should handle negative numbers', () => {
    expect(pluralize(-1, 'item')).toBe('-1 items');
    expect(pluralize(-2, 'item')).toBe('-2 items');
  });
});
