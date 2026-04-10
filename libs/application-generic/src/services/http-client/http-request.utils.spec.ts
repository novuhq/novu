import { expect } from 'chai';
import { parseRawBody, toBodyRecord, toHeadersRecord } from './http-request.utils';

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
});
