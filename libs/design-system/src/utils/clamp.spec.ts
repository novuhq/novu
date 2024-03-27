import { expect, describe, it } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('should return the value itself if it is within the inclusive bounds', () => {
    const result = clamp(5, 0, 10);
    expect(result).to.equal(5);
  });

  it('should clamp the value to the minimum bound if it is less than the minimum bound', () => {
    const result = clamp(-5, 0, 10);
    expect(result).to.equal(0);
  });

  it('should clamp the value to the maximum bound if it is greater than the maximum bound', () => {
    const result = clamp(15, 0, 10);
    expect(result).to.equal(10);
  });

  it('should work correctly with negative values', () => {
    const result = clamp(-7, -10, 5);
    expect(result).to.equal(-7);
  });

  it('should work correctly with decimal values', () => {
    const result = clamp(3.5, 1, 5);
    expect(result).to.equal(3.5);
  });

  it('should handle min and max being the same value', () => {
    const result = clamp(5, 5, 5);
    expect(result).to.equal(5);
  });

  it('should handle min being greater than max by swapping them', () => {
    const result = clamp(8, 10, 5);
    expect(result).to.equal(8);
  });

  it('should handle NaN values by returning NaN', () => {
    const result = clamp(NaN, 0, 10);
    expect(result).to.be.NaN;
  });

  it('should handle Infinity and -Infinity values correctly', () => {
    const result1 = clamp(Infinity, 0, 10);
    expect(result1).to.equal(10);

    const result2 = clamp(-Infinity, 0, 10);
    expect(result2).to.equal(0);
  });
});
