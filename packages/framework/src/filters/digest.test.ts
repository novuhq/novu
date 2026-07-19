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

  it('should list every name when maxNames equals the number of items', () => {
    expect(digest(['John', 'Josh', 'Sarah', 'Mike'], 4)).toBe('John, Josh, Sarah and Mike');
  });

  it('should list every name when maxNames exceeds the number of items', () => {
    expect(digest(['John', 'Josh', 'Sarah', 'Mike', 'Emma'], 10)).toBe('John, Josh, Sarah, Mike and Emma');
  });

  it('should never render "and 0 others" when maxNames covers all items', () => {
    const result = digest(['John', 'Josh', 'Sarah', 'Mike'], 4);
    expect(result).not.toContain('0 other');
  });

  it('should never render a negative others count when maxNames exceeds the items', () => {
    const result = digest(['A', 'B', 'C', 'D', 'E'], 10);
    expect(result).not.toContain('-');
  });

  it('should honor a custom separator when listing all items', () => {
    expect(digest(['John', 'Josh', 'Sarah', 'Mike'], 4, undefined, ' • ')).toBe('John • Josh • Sarah and Mike');
  });
});
