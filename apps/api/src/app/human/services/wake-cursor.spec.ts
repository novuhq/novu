import { BadRequestException } from '@nestjs/common';
import { expect } from 'chai';
import { clampWakeCursor, decodeWakeCursor, encodeWakeCursor, INVALID_WAKE_CURSOR } from './wake-cursor';

describe('wake cursor', () => {
  it('reads back what it handed out, with and without a row', () => {
    const atRow = { at: 1_761_300_000_123, id: '6720aa0b1c2d3e4f5a6b7c8d' };
    const atTime = { at: 1_761_300_000_123 };

    expect(decodeWakeCursor(encodeWakeCursor(atRow))).to.deep.equal(atRow);
    expect(decodeWakeCursor(encodeWakeCursor(atTime))).to.deep.equal(atTime);
    // Opaque, and safe in an address as it is.
    expect(encodeWakeCursor(atRow)).to.match(/^[A-Za-z0-9_-]+$/);
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
          decodeWakeCursor(value);

          return null;
        } catch (caught) {
          return caught;
        }
      })();

      expect(error, value).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).to.include({ code: INVALID_WAKE_CURSOR });
    }
  });

  it('never starts further back than the oldest message that counts, nor in the future', () => {
    const now = 1_761_300_000_000;
    const oldest = now - 24 * 60 * 60 * 1000;
    const cursor = { at: now - 1000, id: '6720aa0b1c2d3e4f5a6b7c8d' };

    expect(clampWakeCursor(cursor, oldest, now)).to.equal(cursor);
    expect(clampWakeCursor({ at: oldest - 1, id: cursor.id }, oldest, now)).to.deep.equal({ at: oldest });
    expect(clampWakeCursor({ at: now + 60_000 }, oldest, now)).to.deep.equal({ at: now });
  });
});
