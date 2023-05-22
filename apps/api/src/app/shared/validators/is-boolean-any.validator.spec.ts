import { IsBooleanAny } from './is-boolean-any.validator';
import { validateSync } from 'class-validator';
import { expect } from 'chai';

function isValid(input: object) {
  const errors = validateSync(input);
  return errors.length === 0;
}

describe('@IsBooleanAny() validator', () => {
  class TestDto {
    constructor(isSomething: any) {
      this.isSomething = isSomething;
    }

    @IsBooleanAny()
    isSomething: boolean;
  }

  it('should accept boolean value', () => {
    const trueBool = new TestDto(true);
    const falseBool = new TestDto(false);

    expect(isValid(trueBool)).to.true;
    expect(isValid(falseBool)).to.true;
  });

  it('should accept string boolean value', () => {
    const trueBool = new TestDto('true');
    const falseBool = new TestDto('false');

    expect(isValid(trueBool)).to.true;
    expect(isValid(falseBool)).to.true;
  });

  it('should NOT accept any other values', () => {
    const withNumber = new TestDto(0);
    const withAnyString = new TestDto('truezz');
    const withObj = new TestDto({ true: 'true' });
    const withNull = new TestDto(null);
    const withUndefined = new TestDto(undefined);

    expect(isValid(withNumber)).to.false;
    expect(isValid(withAnyString)).to.false;
    expect(isValid(withObj)).to.false;
    expect(isValid(withNull)).to.false;
    expect(isValid(withUndefined)).to.false;
  });
});
