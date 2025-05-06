import { RulesLogic, AdditionalOperation } from 'json-logic-js';
import { expect } from 'chai';

import { evaluateRules } from './query-parser.service';

describe('QueryParserService', () => {
  describe('Smoke Tests', () => {
    it('should evaluate a simple equality rule', () => {
      const rule: RulesLogic<AdditionalOperation> = { '=': [{ var: 'value' }, 42] };
      const data = { value: 42 };
      const { result, error } = evaluateRules(rule, data);
      expect(error).to.be.undefined;
      expect(result).to.be.true;
    });

    it('should evaluate a complex nested rule', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        and: [
          { '=': [{ var: 'value' }, 42] },
          { startsWith: [{ var: 'text' }, 'hello'] },
          { notBetween: [{ var: 'number' }, [1, 5]] },
        ],
      };
      const data = { value: 42, text: 'hello world', number: 10 };
      const { result, error } = evaluateRules(rule, data);
      expect(error).to.be.undefined;
      expect(result).to.be.true;
    });

    describe('Error Handling', () => {
      it('should handle invalid data types gracefully', () => {
        const rule: RulesLogic<AdditionalOperation> = { startsWith: [{ var: 'text' }, 123] };
        const data = { text: 'hello' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should throw error when safe mode is disabled', () => {
        const rule: RulesLogic<AdditionalOperation> = { invalid: 'operator' };
        const data = { text: 'hello' };
        expect(() => evaluateRules(rule, data, false)).to.throw('Failed to evaluate rule');
      });

      it('should return false and error when safe mode is enabled', () => {
        const rule: RulesLogic<AdditionalOperation> = { invalid: 'operator' };
        const data = { text: 'hello' };
        const { result, error } = evaluateRules(rule, data, true);
        expect(error).to.not.be.undefined;
        expect(result).to.be.false;
      });
    });
  });

  describe('Custom Operators', () => {
    describe('= operator', () => {
      it('should return true when values are equal', () => {
        const rule: RulesLogic<AdditionalOperation> = { '=': [{ var: 'value' }, 42] };
        const data = { value: 42 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return true when strings are equal', () => {
        const rule: RulesLogic<AdditionalOperation> = { '=': [{ var: 'text' }, 'hello'] };
        const data = { text: 'hello' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return true when comparing number and string (type coercion)', () => {
        const rule: RulesLogic<AdditionalOperation> = { '=': [{ var: 'value' }, '42'] };
        const data = { value: 42 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when values are not equal', () => {
        const rule: RulesLogic<AdditionalOperation> = { '=': [{ var: 'value' }, 42] };
        const data = { value: 43 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when types are different and values cannot be coerced', () => {
        const rule: RulesLogic<AdditionalOperation> = { '=': [{ var: 'value' }, 'not a number'] };
        const data = { value: 42 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('startsWith operator', () => {
      it('should return true when string begins with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { startsWith: [{ var: 'text' }, 'hello'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when string does not begin with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { startsWith: [{ var: 'text' }, 'world'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('endsWith operator', () => {
      it('should return true when string ends with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { endsWith: [{ var: 'text' }, 'world'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when string does not end with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { endsWith: [{ var: 'text' }, 'hello'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('contains operator', () => {
      it('should return true when string contains given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { contains: [{ var: 'text' }, 'llo wo'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when string does not contain given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { contains: [{ var: 'text' }, 'xyz'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('doesNotContain operator', () => {
      it('should return true when string does not contain given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { doesNotContain: [{ var: 'text' }, 'xyz'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when string contains given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { doesNotContain: [{ var: 'text' }, 'llo'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('doesNotBeginWith operator', () => {
      it('should return true when string does not begin with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { doesNotBeginWith: [{ var: 'text' }, 'world'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when string begins with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { doesNotBeginWith: [{ var: 'text' }, 'hello'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('doesNotEndWith operator', () => {
      it('should return true when string does not end with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { doesNotEndWith: [{ var: 'text' }, 'hello'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when string ends with given value', () => {
        const rule: RulesLogic<AdditionalOperation> = { doesNotEndWith: [{ var: 'text' }, 'world'] };
        const data = { text: 'hello world' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('null operator', () => {
      it('should return true when value is null', () => {
        const rule: RulesLogic<AdditionalOperation> = { null: [{ var: 'value' }] };
        const data = { value: null };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when value is not null', () => {
        const rule: RulesLogic<AdditionalOperation> = { null: [{ var: 'value' }] };
        const data = { value: 'hello' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('notNull operator', () => {
      it('should return true when value is not null', () => {
        const rule: RulesLogic<AdditionalOperation> = { notNull: [{ var: 'value' }] };
        const data = { value: 'hello' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when value is null', () => {
        const rule: RulesLogic<AdditionalOperation> = { notNull: [{ var: 'value' }] };
        const data = { value: null };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('notIn operator', () => {
      it('should return true when value is not in array', () => {
        const rule: RulesLogic<AdditionalOperation> = { notIn: [{ var: 'value' }, ['a', 'b', 'c']] };
        const data = { value: 'd' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when value is in array', () => {
        const rule: RulesLogic<AdditionalOperation> = { notIn: [{ var: 'value' }, ['a', 'b', 'c']] };
        const data = { value: 'b' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when ruleValue is not an array', () => {
        const rule: RulesLogic<AdditionalOperation> = { notIn: [{ var: 'value' }, 'not an array'] };
        const data = { value: 'b' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('between operator', () => {
      it('should return true when number is between min and max', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5, 10]] };
        const data = { value: 7 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return true when number equals min', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5, 10]] };
        const data = { value: 5 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return true when number equals max', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5, 10]] };
        const data = { value: 10 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when number is less than min', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5, 10]] };
        const data = { value: 4 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when number is greater than max', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5, 10]] };
        const data = { value: 11 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when value is not a number', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5, 10]] };
        const data = { value: 'not a number' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when range is not valid', () => {
        const rule: RulesLogic<AdditionalOperation> = { between: [{ var: 'value' }, [5]] };
        const data = { value: 7 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });

    describe('notBetween operator', () => {
      it('should return true when number is less than min', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5, 10]] };
        const data = { value: 4 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return true when number is greater than max', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5, 10]] };
        const data = { value: 11 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.true;
      });

      it('should return false when number is between min and max', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5, 10]] };
        const data = { value: 7 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when number equals min', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5, 10]] };
        const data = { value: 5 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when number equals max', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5, 10]] };
        const data = { value: 10 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when value is not a number', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5, 10]] };
        const data = { value: 'not a number' };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });

      it('should return false when range is not valid', () => {
        const rule: RulesLogic<AdditionalOperation> = { notBetween: [{ var: 'value' }, [5]] };
        const data = { value: 7 };
        const { result, error } = evaluateRules(rule, data);
        expect(error).to.be.undefined;
        expect(result).to.be.false;
      });
    });
  });
});
