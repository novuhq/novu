import { describe, expect, it } from 'vitest';
import { pluralize } from './pluralize';

describe('pluralize', () => {
  it('should return empty string for falsy values', () => {
    expect(pluralize(null)).toBe('');
    expect(pluralize(undefined)).toBe('');
  });

  it('should handle arrays and count their length', () => {
    expect(pluralize([], 'item')).toBe('');
    expect(pluralize(['a'], 'item')).toBe('1 item');
    expect(pluralize(['a', 'b'], 'item')).toBe('2 items');
    expect(pluralize(['a', 'b', 'c'], 'item')).toBe('3 items');
  });

  it('should handle objects and count their keys', () => {
    expect(pluralize({}, 'property')).toBe('');
    expect(pluralize({ a: 1 }, 'property')).toBe('1 property');
    expect(pluralize({ a: 1, b: 2 }, 'property')).toBe('2 properties');
  });

  it('should convert string numbers to numeric values', () => {
    expect(pluralize('0', 'item')).toBe('');
    expect(pluralize('1', 'item')).toBe('1 item');
    expect(pluralize('2', 'item')).toBe('2 items');
    expect(pluralize('10', 'item')).toBe('10 items');
    expect(pluralize('asdf', 'item')).toBe('');
  });

  it('should handle numeric values directly', () => {
    expect(pluralize(0, 'item')).toBe('');
    expect(pluralize(1, 'item')).toBe('1 item');
    expect(pluralize(2, 'item')).toBe('2 items');
    expect(pluralize(10, 'item')).toBe('10 items');
  });

  it('should handle other values by converting them to numbers', () => {
    expect(pluralize(true, 'item')).toBe('1 item');
    expect(pluralize(false, 'item')).toBe('');
  });

  it('should handle NaN values by returning empty string', () => {
    expect(pluralize(NaN, 'item')).toBe('');
  });

  it('should handle custom plural forms when provided', () => {
    expect(pluralize(0, 'child', 'children')).toBe('');
    expect(pluralize(1, 'child', 'children')).toBe('1 child');
    expect(pluralize(2, 'child', 'children')).toBe('2 children');

    expect(pluralize(0, 'person', 'people')).toBe('');
    expect(pluralize(1, 'person', 'people')).toBe('1 person');
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
  });

  it('should use plur library for automatic pluralization when no custom plural is provided', () => {
    // Regular pluralization (adding 's')
    expect(pluralize(0, 'apple')).toBe('');
    expect(pluralize(1, 'apple')).toBe('1 apple');
    expect(pluralize(2, 'apple')).toBe('2 apples');

    // Words ending in 'y'
    expect(pluralize(0, 'berry')).toBe('');
    expect(pluralize(1, 'berry')).toBe('1 berry');
    expect(pluralize(2, 'berry')).toBe('2 berries');

    // Words ending in 'f' or 'fe'
    expect(pluralize(0, 'leaf')).toBe('');
    expect(pluralize(1, 'leaf')).toBe('1 leaf');
    expect(pluralize(2, 'leaf')).toBe('2 leaves');

    // Irregular plurals
    expect(pluralize(0, 'child')).toBe('');
    expect(pluralize(1, 'child')).toBe('1 child');
    expect(pluralize(2, 'child')).toBe('2 children');

    expect(pluralize(0, 'person')).toBe('');
    expect(pluralize(1, 'person')).toBe('1 person');
    expect(pluralize(2, 'person')).toBe('2 people');
  });

  it('should handle decimal numbers', () => {
    expect(pluralize(1.5, 'apple')).toBe('1.5 apples');
    expect(pluralize(0.5, 'portion')).toBe('0.5 portions');
  });

  it('should handle negative numbers by returning empty string', () => {
    expect(pluralize(-1, 'item')).toBe('');
    expect(pluralize(-2, 'item')).toBe('');
  });

  it('should return empty string for count <= 0', () => {
    expect(pluralize(0, 'item')).toBe('');
    expect(pluralize(-1, 'item')).toBe('');
    expect(pluralize(-10, 'item')).toBe('');
    expect(pluralize('0', 'item')).toBe('');
    expect(pluralize('-5', 'item')).toBe('');
    expect(pluralize([], 'item')).toBe('');
    expect(pluralize({}, 'property')).toBe('');
    expect(pluralize(false, 'item')).toBe('');
    expect(pluralize(NaN, 'item')).toBe('');
    expect(pluralize('invalid', 'item')).toBe('');
  });

  it('should support hiding count when showCount is false', () => {
    expect(pluralize(1, 'item', '', 'false')).toBe('item');
    expect(pluralize(2, 'item', '', 'false')).toBe('items');
    expect(pluralize(1, 'child', 'children', 'false')).toBe('child');
    expect(pluralize(2, 'child', 'children', 'false')).toBe('children');
    expect(pluralize(1, 'apple', '', 'false')).toBe('apple');
    expect(pluralize(2, 'apple', '', 'false')).toBe('apples');
  });

  it('should show count by default when showCount is not specified', () => {
    expect(pluralize(1, 'item')).toBe('1 item');
    expect(pluralize(2, 'item')).toBe('2 items');
    expect(pluralize(1, 'child', 'children')).toBe('1 child');
    expect(pluralize(2, 'child', 'children')).toBe('2 children');
  });

  it('should show count when showCount is explicitly true', () => {
    expect(pluralize(1, 'item', '', 'true')).toBe('1 item');
    expect(pluralize(2, 'item', '', 'true')).toBe('2 items');
    expect(pluralize(1, 'child', 'children', 'true')).toBe('1 child');
    expect(pluralize(2, 'child', 'children', 'true')).toBe('2 children');
  });

  it('should return empty string for count <= 0 regardless of showCount', () => {
    expect(pluralize(0, 'item', '', 'false')).toBe('');
    expect(pluralize(-1, 'item', '', 'false')).toBe('');
    expect(pluralize(0, 'item', '', 'true')).toBe('');
    expect(pluralize(-1, 'item', '', 'true')).toBe('');
  });
});
