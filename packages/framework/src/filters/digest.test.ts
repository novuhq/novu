import { describe, expect, it } from 'vitest';
import { digest } from './digest';

describe('digest', () => {
  it('should return empty string for non-arrays or empty arrays', () => {
    expect(digest(null)).toBe('');
    expect(digest(undefined)).toBe('');
    expect(digest([])).toBe('');
  });

  it('should return the single value for one item', () => {
    expect(digest(['John'])).toBe('John');
  });

  it('should join two items with "and"', () => {
    expect(digest(['John', 'Josh'])).toBe('John and Josh');
  });

  it('should show all three names without a doubled separator when maxNames >= 3', () => {
    expect(digest(['John', 'Josh', 'Sarah'], 3)).toBe('John, Josh and Sarah');
  });

  it('should respect a custom separator when showing all three names', () => {
    expect(digest(['John', 'Josh', 'Sarah'], 3, undefined, ' • ')).toBe('John • Josh and Sarah');
  });

  it('should use the "others" format for 4+ items', () => {
    expect(digest(['John', 'Josh', 'Sarah', 'Mike'])).toBe('John, Josh and 2 others');
  });
});
