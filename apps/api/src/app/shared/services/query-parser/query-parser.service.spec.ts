import { expect } from 'chai';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';

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

    describe('Relative Date Operators', () => {
      describe('moreThanXAgo operator', () => {
        it('should return true when date is more than 5 days ago', () => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: sevenDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should return false when date is less than 5 days ago', () => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: threeDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });

        it('should return false with invalid date input', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: 'invalid-date' };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });

        it('should return false with invalid rule value', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 'invalid', unit: 'days' }],
          };
          const data = { createdAt: new Date().toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });
      });

      describe('lessThanXAgo operator', () => {
        it('should return true when date is less than 5 days ago', () => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

          const rule: RulesLogic<AdditionalOperation> = {
            lessThanXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: threeDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should return false when date is more than 5 days ago', () => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const rule: RulesLogic<AdditionalOperation> = {
            lessThanXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: sevenDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });
      });

      describe('withinLast operator', () => {
        it('should return true when date is within last 5 days', () => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

          const rule: RulesLogic<AdditionalOperation> = {
            withinLast: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: threeDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should return false when date is more than 5 days ago', () => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const rule: RulesLogic<AdditionalOperation> = {
            withinLast: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: sevenDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });

        it('should return false when date is in the future', () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          const rule: RulesLogic<AdditionalOperation> = {
            withinLast: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: tomorrow.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });
      });

      describe('notWithinLast operator', () => {
        it('should return true when date is more than 5 days ago', () => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const rule: RulesLogic<AdditionalOperation> = {
            notWithinLast: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: sevenDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should return false when date is within last 5 days', () => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

          const rule: RulesLogic<AdditionalOperation> = {
            notWithinLast: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: threeDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });
      });

      describe('exactlyXAgo operator', () => {
        it('should return true when date is exactly (within tolerance) 5 days ago', () => {
          const fiveDaysAgo = new Date();
          fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

          const rule: RulesLogic<AdditionalOperation> = {
            exactlyXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: fiveDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should return false when date is significantly different from 5 days ago', () => {
          const tenDaysAgo = new Date();
          tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

          const rule: RulesLogic<AdditionalOperation> = {
            exactlyXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'days' }],
          };
          const data = { createdAt: tenDaysAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.false;
        });
      });

      describe('Different time units', () => {
        it('should work with hours', () => {
          const threeHoursAgo = new Date();
          threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

          const rule: RulesLogic<AdditionalOperation> = {
            withinLast: [{ var: 'createdAt' }, { amount: 5, unit: 'hours' }],
          };
          const data = { createdAt: threeHoursAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should work with minutes', () => {
          const tenMinutesAgo = new Date();
          tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 5, unit: 'minutes' }],
          };
          const data = { createdAt: tenMinutesAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should work with weeks', () => {
          const threeWeeksAgo = new Date();
          threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 2, unit: 'weeks' }],
          };
          const data = { createdAt: threeWeeksAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should work with months', () => {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 2, unit: 'months' }],
          };
          const data = { createdAt: threeMonthsAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });

        it('should work with years', () => {
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

          const rule: RulesLogic<AdditionalOperation> = {
            moreThanXAgo: [{ var: 'createdAt' }, { amount: 1, unit: 'years' }],
          };
          const data = { createdAt: twoYearsAgo.toISOString() };
          const { result, error } = evaluateRules(rule, data);
          expect(error).to.be.undefined;
          expect(result).to.be.true;
        });
      });
    });
  });
});
