import { expect } from 'chai';
import { LimitPipe } from './limit-pipe';
import { Paramtype } from '@nestjs/common/interfaces/features/paramtype.interface';

enum METADATA {
  DATA = 'limit',
  TYPE = 'query',
}

describe('LimitPipe', () => {
  let pipe: LimitPipe;
  const metadata = { data: METADATA.DATA, type: METADATA.TYPE as Paramtype, metatype: String };

  beforeEach(() => {
    pipe = new LimitPipe(1, 1000);
  });

  it('should return the input value if it is within the limits', () => {
    let limit = 1;
    let res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);

    limit = 500;
    res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);

    limit = 999;
    res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);

    limit = 1000;
    res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);
  });

  it('should throw exception when the limit is lower then the min threshold', () => {
    let limit = -1;
    expect(() => pipe.transform(limit, metadata)).to.throw(`${METADATA.DATA} must not be less than 1`);

    limit = 0;
    expect(() => pipe.transform(limit, metadata)).to.throw(`${METADATA.DATA} must not be less than 1`);
  });

  it('should throw exception when the limit is higher then the limit ', () => {
    let limit = 1001;
    expect(() => pipe.transform(limit, metadata)).to.throw(`${METADATA.DATA} must not be greater than 1000`);
  });

  it('should return undefined input value if optional', () => {
    pipe = new LimitPipe(1, 1000, true);
    let limit: undefined | null = undefined;
    let res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);

    limit = null;
    res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);
  });

  it('should throw exception if the input value is not optional', () => {
    pipe = new LimitPipe(1, 1000, false);
    let limit: undefined | null = undefined;
    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );

    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );

    limit = null;
    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );
  });

  it('should set isOptional as false by default on LimitPipe initialize', () => {
    pipe = new LimitPipe(1, 1000);
    const limit = undefined;
    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );
  });
});
