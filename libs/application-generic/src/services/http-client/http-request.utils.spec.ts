import { SECRET_MASK } from '@novu/shared';
import { expect } from 'chai';
import {
  buildInvalidJsonBodyDetail,
  parseRawBody,
  resolveHttpRequestBody,
  toBodyRecord,
  toHeadersRecord,
} from './http-request.utils';

describe('http-request.utils', () => {
  describe('toBodyRecord', () => {
    it('should convert key-value pairs to a record', () => {
      const pairs = [
        { key: 'name', value: 'test' },
        { key: 'count', value: '5' },
      ];
      expect(toBodyRecord(pairs)).to.deep.equal({ name: 'test', count: '5' });
    });

    it('should return undefined for empty array', () => {
      expect(toBodyRecord([])).to.equal(undefined);
    });

    it('should skip pairs with empty keys', () => {
      const pairs = [
        { key: '', value: 'ignored' },
        { key: 'valid', value: 'kept' },
      ];
      expect(toBodyRecord(pairs)).to.deep.equal({ valid: 'kept' });
    });
  });

  describe('toHeadersRecord', () => {
    it('should convert key-value pairs to a record', () => {
      const pairs = [{ key: 'Content-Type', value: 'application/json' }];
      expect(toHeadersRecord(pairs)).to.deep.equal({ 'Content-Type': 'application/json' });
    });
  });

  describe('parseRawBody', () => {
    it('should parse valid JSON object', () => {
      const raw = '{"name":"test","nested":{"key":"value"}}';
      expect(parseRawBody(raw)).to.deep.equal({ name: 'test', nested: { key: 'value' } });
    });

    it('should support nested objects and arrays', () => {
      const raw = '{"voice":{"language":"fr","gender":"Male","number":1},"tags":["a","b"]}';
      const result = parseRawBody(raw);
      expect(result).to.deep.equal({
        voice: { language: 'fr', gender: 'Male', number: 1 },
        tags: ['a', 'b'],
      });
    });

    it('should accept top-level JSON arrays', () => {
      expect(parseRawBody('[1,2,3]')).to.deep.equal([1, 2, 3]);
      expect(parseRawBody('[{"id":1}]')).to.deep.equal([{ id: 1 }]);
    });

    it('should throw for invalid JSON', () => {
      expect(() => parseRawBody('not json')).to.throw();
    });

    it('should throw for JSON string', () => {
      expect(() => parseRawBody('"hello"')).to.throw('Raw body must be a JSON object or array');
    });

    it('should throw for JSON null', () => {
      expect(() => parseRawBody('null')).to.throw('Raw body must be a JSON object or array');
    });
  });

  describe('resolveHttpRequestBody', () => {
    it('should parse canonical raw JSON string bodies', () => {
      expect(resolveHttpRequestBody('{"name":"test"}')).to.deep.equal({ name: 'test' });
    });

    it('should parse canonical top-level JSON arrays', () => {
      expect(resolveHttpRequestBody('[{"id":1}]')).to.deep.equal([{ id: 1 }]);
    });

    it('should convert legacy key-value array bodies', () => {
      expect(resolveHttpRequestBody([{ key: 'name', value: 'test' }])).to.deep.equal({ name: 'test' });
    });

    it('should return undefined for empty values', () => {
      expect(resolveHttpRequestBody('')).to.equal(undefined);
      expect(resolveHttpRequestBody('   ')).to.equal(undefined);
      expect(resolveHttpRequestBody([])).to.equal(undefined);
      expect(resolveHttpRequestBody(undefined)).to.equal(undefined);
    });

    it('should throw for invalid raw JSON string bodies', () => {
      expect(() => resolveHttpRequestBody('not json')).to.throw();
    });
  });

  describe('buildInvalidJsonBodyDetail', () => {
    const buildLongBody = (broken: string) => `{"padding":"${'x'.repeat(500)}","order":${broken}}`;

    it('should excerpt the body around a position carried on the error', () => {
      const body = buildLongBody('{"sku" }');
      const position = body.indexOf('{"sku" }') + 7;
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position }), body);

      expect(detail.error).to.equal('Invalid raw JSON body: Colon expected');
      expect(detail.bodyExcerpt).to.contain('"order":{"sku" }');
      expect(detail.bodyExcerpt).to.contain('...');
      expect(detail.bodyExcerpt).to.not.contain('x'.repeat(200));
    });

    it('should read the position out of a JSON.parse message when none is attached', () => {
      const body = buildLongBody('{"sku" }');
      let thrown: unknown;
      try {
        JSON.parse(body);
      } catch (error) {
        thrown = error;
      }

      const detail = buildInvalidJsonBodyDetail(thrown, body);

      expect(detail.bodyExcerpt).to.contain('"order":{"sku" }');
    });

    it('should omit the excerpt when the position cannot be determined', () => {
      const detail = buildInvalidJsonBodyDetail(new Error('Raw body must be a JSON object or array'), '"hello"');

      expect(detail.error).to.equal('Invalid raw JSON body: Raw body must be a JSON object or array');
      expect(detail.bodyExcerpt).to.equal(undefined);
      expect(detail.hint).to.be.a('string');
    });

    it('should omit the excerpt for key-value pair bodies', () => {
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position: 3 }), [
        { key: 'name', value: 'test' },
      ]);

      expect(detail.bodyExcerpt).to.equal(undefined);
    });

    it('should fall back to a generic message for non-Error throwables', () => {
      const detail = buildInvalidJsonBodyDetail('boom', '{}');

      expect(detail.error).to.equal('Invalid raw JSON body: Failed to parse raw JSON body');
    });

    it('should mask secret values that land inside the excerpt', () => {
      const secret = 'sk_live_51NQpZmKq7xTvR3wY';
      const body = `{"token":"${secret}","order":{"sku" }}`;
      const position = body.indexOf('{"sku" }') + 7;
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position }), body, [
        secret,
      ]);

      expect(detail.bodyExcerpt).to.not.contain(secret);
      expect(detail.bodyExcerpt).to.contain(SECRET_MASK);
      expect(detail.bodyExcerpt).to.contain('"order":{"sku" }');
    });

    it('should mask a secret rendered in its JSON-escaped form', () => {
      const secret = 'pa$$"word\nline';
      const escaped = JSON.stringify(secret).slice(1, -1);
      const body = `{"token":"${escaped}","order":{"sku" }}`;
      const position = body.indexOf('{"sku" }') + 7;
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position }), body, [
        secret,
      ]);

      expect(detail.bodyExcerpt).to.not.contain(escaped);
      expect(detail.bodyExcerpt).to.contain(SECRET_MASK);
    });

    it('should not leak a partial secret straddling the excerpt boundary', () => {
      const secret = `sk_live_${'a'.repeat(80)}_tail`;
      // Places the secret so that only its tail would fall inside an unmasked window.
      const body = `{"token":"${secret}","order":{"sku" }}`;
      const position = body.indexOf('{"sku" }') + 7;
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position }), body, [
        secret,
      ]);

      expect(detail.bodyExcerpt).to.not.contain('aaaa');
      expect(detail.bodyExcerpt).to.not.contain('_tail');
      expect(detail.bodyExcerpt).to.contain('"order":{"sku" }');
    });

    it('should keep the excerpt centered on the failure after masking', () => {
      const secret = 'sk_live_51NQpZmKq7xTvR3wY';
      const body = `{"token":"${secret}","padding":"${'y'.repeat(300)}","order":{"sku" }}`;
      const position = body.indexOf('{"sku" }') + 7;
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position }), body, [
        secret,
      ]);

      expect(detail.bodyExcerpt).to.contain('"order":{"sku" }');
    });

    it('should ignore empty secret values', () => {
      const body = '{"order":{"sku" }}';
      const detail = buildInvalidJsonBodyDetail(Object.assign(new Error('Colon expected'), { position: 16 }), body, [
        '',
      ]);

      expect(detail.bodyExcerpt).to.equal(body);
    });
  });
});
