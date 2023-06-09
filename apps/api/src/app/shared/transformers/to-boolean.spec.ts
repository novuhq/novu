import { expect } from 'chai';
import { TransformToBoolean } from './to-boolean';
import { plainToInstance } from 'class-transformer';

function transform(input: { isSomething: any }) {
  return plainToInstance(TestDto, input);
}

class TestDto {
  constructor(isSomething: any) {
    this.isSomething = isSomething;
  }

  @TransformToBoolean()
  isSomething: boolean;
}

describe('@TransformToBoolean() transformer', () => {
  it('should transform "true" to true', () => {
    const result = transform({ isSomething: 'true' });
    expect(result.isSomething).to.equal(true);
  });

  it('should transform "false" to false', () => {
    const result = transform({ isSomething: 'false' });
    expect(result.isSomething).to.equal(false);
  });

  it('should not transform any other string values', () => {
    const result = transform({ isSomething: 'truez' });
    expect(typeof result.isSomething).not.equal('boolean');
  });

  it('should not transform numbers', () => {
    const result = transform({ isSomething: 1 });
    expect(typeof result.isSomething).not.equal('boolean');
  });

  it('should not transform objects', () => {
    const result = transform({ isSomething: { true: false } });
    expect(typeof result.isSomething).not.equal('boolean');
  });

  it('should not transform null value', () => {
    const result = transform({ isSomething: null });
    expect(typeof result.isSomething).not.equal('boolean');
  });
});
