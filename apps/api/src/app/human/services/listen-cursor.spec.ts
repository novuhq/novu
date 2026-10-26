import { BadRequestException } from '@nestjs/common';
import { expect } from 'chai';
import { clampListenCursor, decodeListenCursor, encodeListenCursor, INVALID_LISTEN_CURSOR } from './listen-cursor';

describe('listen cursor', () => {
  it('reads back what it handed out, with and without a row', () => {
    const atRow = { at: 1_761_300_000_123, id: '6720aa0b1c2d3e4f5a6b7c8d' };
    const atTime = { at: 1_761_300_000_123 };

    expect(decodeListenCursor(encodeListenCursor(atRow))).to.deep.equal(atRow);
    expect(decodeListenCursor(encodeListenCursor(atTime))).to.deep.equal(atTime);
    // Opaque, and safe in an address as it is.
    expect(encodeListenCursor(atRow)).to.match(/^[A-Za-z0-9_-]+$/);
  });

  it('refuses anything it did not hand out', () => {
    for (const value of [
      'not-a-cursor',
      '',
      Buffer.from('w2:1761300000123:').toString('base64url'),
      Buffer.from('w1:soon:').toString('base64url'),
      Buffer.from('w1:1761300000123:$gt').toString('base64url'),
      Buffer.from('w1:1761300000123:6720aa0b1c2d3e4f5a6b7c8d:extra').toString('base64url'),
    ]) {
      const error = (() => {
        try {
          decodeListenCursor(value);

          return null;
        } catch (caught) {
          return caught;
        }
      })();

      expect(error, value).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).to.include({ code: INVALID_LISTEN_CURSOR });
    }
  });

  it('never starts further back than the oldest message that counts, nor in the future', () => {
    const now = 1_761_300_000_000;
    const oldest = now - 24 * 60 * 60 * 1000;
    const cursor = { at: now - 1000, id: '6720aa0b1c2d3e4f5a6b7c8d' };

    expect(clampListenCursor(cursor, oldest, now)).to.equal(cursor);
    expect(clampListenCursor({ at: oldest - 1, id: cursor.id }, oldest, now)).to.deep.equal({ at: oldest });
    expect(clampListenCursor({ at: now + 60_000 }, oldest, now)).to.deep.equal({ at: now });
  });
});
