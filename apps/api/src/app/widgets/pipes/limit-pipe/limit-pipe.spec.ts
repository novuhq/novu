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
    let limit = 500;
    let res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);

    limit = -1;
    expect(() => pipe.transform(limit, metadata)).to.throw(`${METADATA.DATA} must not be less than 1`);

    limit = 0;
    expect(() => pipe.transform(limit, metadata)).to.throw(`${METADATA.DATA} must not be less than 1`);

    limit = 1;
    res = pipe.transform(limit, metadata);
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

    limit = 1001;
    expect(() => pipe.transform(limit, metadata)).to.throw(`${METADATA.DATA} must not be greater than 1000`);
  });

  it('should return undefined input value if optional', () => {
    pipe = new LimitPipe(1, 1000, true);
    let limit = undefined;
    let res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);

    pipe = new LimitPipe(1, 1000, true);
    limit = null as any;
    res = pipe.transform(limit, metadata);
    expect(res).to.equal(limit);
  });

  it('should throw exception if the input value is not optional', () => {
    pipe = new LimitPipe(1, 1000);
    let limit = undefined;
    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );

    pipe = new LimitPipe(1, 1000);
    limit = null as any;
    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );

    pipe = new LimitPipe(1, 1000, false);
    limit = undefined;
    expect(() => pipe.transform(limit, metadata)).to.throw(
      `${METADATA.DATA} must be a number conforming to the specified constraints`
    );
  });
});
