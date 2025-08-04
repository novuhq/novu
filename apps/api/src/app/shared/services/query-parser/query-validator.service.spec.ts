import { expect } from 'chai';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { QueryIssueTypeEnum, QueryValidatorService } from './query-validator.service';
import { COMPARISON_OPERATORS, JsonLogicOperatorEnum } from './types';

describe('QueryValidatorService', () => {
  let queryValidatorService: QueryValidatorService;

  beforeEach(() => {
    const allowedVariables = [
      'payload.foo',
      'payload.bar',
      'subscriber.firstName',
      'subscriber.email',
      'allowed.field',
    ];
    const allowedNamespaces = ['payload.', 'subscriber.data.'];
    queryValidatorService = new QueryValidatorService(allowedVariables, allowedNamespaces);
  });

  describe('validateQueryRules', () => {
    it('should validate a invalid node structure', () => {
      const rule: RulesLogic<AdditionalOperation> = null;

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Invalid node structure');
      expect(issues[0].path).to.deep.equal([]);
    });

    describe('logical operators', () => {
      [JsonLogicOperatorEnum.AND, JsonLogicOperatorEnum.OR].forEach((operator) => {
        it(`should validate valid ${operator} operation`, () => {
          const rule: RulesLogic<AdditionalOperation> = {
            [operator]: [{ '==': [{ var: 'payload.foo' }, 'value1'] }, { '==': [{ var: 'payload.bar' }, 'value2'] }],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.be.empty;
        });

        it(`should detect invalid ${operator} structure`, () => {
          const rule: any = {
            [operator]: { '==': [{ var: 'payload.foo' }, 'value'] }, // Invalid: and should be an array
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include(`Invalid logical operator "${operator}"`);
          expect(issues[0].path).to.deep.equal([]);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
        });
      });

      it('should validate NOT operation', () => {
        const rule: RulesLogic<AdditionalOperation> = {
          '!': { '==': [{ var: 'payload.foo' }, 'value'] },
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.be.empty;
      });

      it('should detect invalid NOT operation', () => {
        const rule: RulesLogic<AdditionalOperation> = {
          '!': { '==': [{ var: 'payload.foo' }, ''] },
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.have.lengthOf(1);
        expect(issues[0].message).to.include('Value is required');
        expect(issues[0].path).to.deep.equal([]);
        expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
      });
    });

    describe('in operation', () => {
      it('should detect invalid array in operation', () => {
        const rule: any = {
          in: [],
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.have.lengthOf(1);
        expect(issues[0].message).to.include('Invalid operation structure');
        expect(issues[0].path).to.deep.equal([]);
        expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
      });

      describe('"in" operation', () => {
        it('should validate valid "in" operation', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            in: [{ var: 'subscriber.firstName' }, ['value1', 'value2']],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.be.empty;
        });

        it('should detect invalid field reference in "in" operation', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            in: [{}, [1, 2]],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Invalid field reference in comparison');
          expect(issues[0].path).to.deep.equal([]);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
        });

        it('should detect empty array in "in" operation', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            in: [{ var: 'payload.foo' }, []],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Value is required');
          expect(issues[0].path).to.deep.equal([]);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
        });
      });

      describe('"contains" operation', () => {
        it('should validate valid "contains" operation', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            in: ['search', { var: 'payload.foo' }],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.be.empty;
        });

        it('should detect invalid field reference in "contains" operation', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            in: ['search', {}],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Invalid field reference in comparison');
          expect(issues[0].path).to.deep.equal([]);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
        });

        it('should detect invalid value in "contains" operation', () => {
          const rule: RulesLogic<AdditionalOperation> = {
            in: ['', { var: 'payload.foo' }],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Value is required');
          expect(issues[0].path).to.deep.equal([]);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
        });
      });
    });

    describe('between operation', () => {
      it('should validate valid between operation', () => {
        const rule: RulesLogic<AdditionalOperation> = {
          '<=': [1, { var: 'payload.foo' }, 10],
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.be.empty;
      });

      it('should detect invalid between structure from lower bound', () => {
        const rule: any = {
          '<=': [undefined, { var: 'payload.foo' }, 10], // Missing lower bound
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.have.lengthOf(1);
        expect(issues[0].message).to.include('Value is required');
        expect(issues[0].path).to.deep.equal([]);
        expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
      });

      it('should detect invalid between structure from upper bound', () => {
        const rule: any = {
          '<=': [1, { var: 'payload.foo' }, undefined], // Missing upper bound
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.have.lengthOf(1);
        expect(issues[0].message).to.include('Value is required');
        expect(issues[0].path).to.deep.equal([]);
        expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
      });

      it('should detect invalid field reference in "contains" operation', () => {
        const rule: any = {
          '<=': [1, {}, 1], // invalid field reference
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.have.lengthOf(1);
        expect(issues[0].message).to.include('Invalid field reference in comparison');
        expect(issues[0].path).to.deep.equal([]);
        expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
      });
    });

    describe('comparison operators', () => {
      COMPARISON_OPERATORS.forEach((operator) => {
        it(`should validate a valid simple ${operator} rule`, () => {
          const rule: RulesLogic<AdditionalOperation> = {
            [operator]: [{ var: 'subscriber.firstName' }, 'value'],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.be.empty;
        });

        it(`should detect invalid ${operator} structure`, () => {
          const rule: any = {
            [operator]: [{ var: 'subscriber.firstName' }], // Missing second operand
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Invalid operation structure');
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
        });

        it(`should detect invalid field reference in "${operator}" operation`, () => {
          const rule: RulesLogic<AdditionalOperation> = {
            [operator]: [{}, 'value'],
          };

          const issues = queryValidatorService.validateQueryRules(rule);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Invalid field reference in comparison');
          expect(issues[0].path).to.deep.equal([]);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_STRUCTURE);
        });
      });

      it('should validate valid comparison operations', () => {
        const validOperations: RulesLogic<AdditionalOperation>[] = [
          { '<': [{ var: 'payload.foo' }, 5] },
          { '>': [{ var: 'payload.foo' }, 5] },
          { '<=': [{ var: 'payload.foo' }, 5] },
          { '>=': [{ var: 'payload.foo' }, 5] },
          { '==': [{ var: 'payload.foo' }, 'value'] },
          { '!=': [{ var: 'payload.foo' }, 'value'] },
        ];

        validOperations.forEach((operation) => {
          const issues = queryValidatorService.validateQueryRules(operation);
          expect(issues).to.be.empty;
        });
      });

      it('should handle null values correctly for isNull', () => {
        const rule: RulesLogic<AdditionalOperation> = {
          '==': [{ var: 'payload.foo' }, null],
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.be.empty;
      });

      it('should handle null values correctly for !isNull', () => {
        const rule: RulesLogic<AdditionalOperation> = {
          '!=': [{ var: 'payload.foo' }, null],
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.be.empty;
      });

      it('should detect null values for non-equality operators', () => {
        const rule: RulesLogic<AdditionalOperation> = {
          '>': [{ var: 'payload.foo' }, null],
        };

        const issues = queryValidatorService.validateQueryRules(rule);

        expect(issues).to.have.lengthOf(1);
        expect(issues[0].message).to.include('Value is required');
        expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
      });
    });

    describe('path calculation', () => {
      const tests = [
        {
          name: 'single rule',
          rule: {
            and: [
              {
                '==': [
                  {
                    var: 'subscriber.email',
                  },
                  '',
                ],
              },
            ],
          },
          path: [0],
        },
        {
          name: 'second rule',
          rule: {
            and: [
              {
                '==': [
                  {
                    var: 'subscriber.email',
                  },
                  'asdf',
                ],
              },
              {
                '==': [
                  {
                    var: 'subscriber.email',
                  },
                  '',
                ],
              },
            ],
          },
          path: [1],
        },
        {
          name: 'nested rule',
          rule: {
            and: [
              {
                and: [
                  {
                    '==': [
                      {
                        var: 'subscriber.email',
                      },
                      '',
                    ],
                  },
                ],
              },
            ],
          },
          path: [0, 0],
        },
        {
          name: 'nested second rule',
          rule: {
            and: [
              {
                and: [
                  {
                    '==': [
                      {
                        var: 'subscriber.email',
                      },
                      'asdf',
                    ],
                  },
                  {
                    '!=': [
                      {
                        var: 'subscriber.email',
                      },
                      undefined,
                    ],
                  },
                ],
              },
            ],
          },
          path: [0, 1],
        },
        {
          name: 'second or operator first rule',
          rule: {
            or: [
              {
                and: [
                  {
                    '==': [
                      {
                        var: 'subscriber.email',
                      },
                      'asdf',
                    ],
                  },
                  {
                    '!=': [
                      {
                        var: 'subscriber.email',
                      },
                      '22',
                    ],
                  },
                ],
              },
              {
                or: [
                  {
                    '==': [
                      {
                        var: 'subscriber.email',
                      },
                      '',
                    ],
                  },
                ],
              },
            ],
          },
          path: [1, 0],
        },
        {
          name: 'nested not in operation',
          rule: {
            or: [
              {
                and: [
                  {
                    '==': [
                      {
                        var: 'subscriber.email',
                      },
                      'asdf',
                    ],
                  },
                  {
                    '!': {
                      in: [
                        '',
                        {
                          var: 'subscriber.firstName',
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          path: [0, 1],
        },
      ];

      tests.forEach((test) => {
        it(`should return the correct path for ${test.name}`, () => {
          const { rule, path } = test;

          const issues = queryValidatorService.validateQueryRules(rule as any);

          expect(issues).to.have.lengthOf(1);
          expect(issues[0].message).to.include('Value is required');
          expect(issues[0].path).to.deep.equal(path);
          expect(issues[0].type).to.equal(QueryIssueTypeEnum.MISSING_VALUE);
        });
      });
    });
  });

  describe('field validation', () => {
    it('should validate allowed fields', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'allowed.field' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.be.empty;
    });

    it('should validate fields with allowed prefixes', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'subscriber.data.foo' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.be.empty;
    });

    it('should validate namespace field itself (subscriber.data)', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'subscriber.data' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.be.empty;
    });

    it('should detect invalid namespace field (payload)', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'payload' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Value is not valid');
      expect(issues[0].path).to.deep.equal([]);
      expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_FIELD_VALUE);
    });

    it('should detect invalid field that is not in allowed list', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'not_allowed_field' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Value is not valid');
      expect(issues[0].path).to.deep.equal([]);
      expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_FIELD_VALUE);
    });

    it('should detect empty field value', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: '' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Value is not valid');
      expect(issues[0].path).to.deep.equal([]);
      expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_FIELD_VALUE);
    });

    it('should detect invalid prefix', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'invalid.prefix.field' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Value is not valid');
      expect(issues[0].path).to.deep.equal([]);
      expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_FIELD_VALUE);
    });

    it('should detect invalid field with allowed prefixes', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        '==': [{ var: 'payload.' }, 'value'],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Value is not valid');
      expect(issues[0].path).to.deep.equal([]);
      expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_FIELD_VALUE);
    });

    it('should validate complex query with multiple field references', () => {
      const rule: RulesLogic<AdditionalOperation> = {
        and: [
          { '==': [{ var: 'payload.foo' }, 'value1'] },
          { '==': [{ var: 'subscriber.data.bar' }, 'value2'] },
          { '!=': [{ var: 'invalid.field' }, 'value3'] },
        ],
      };

      const issues = queryValidatorService.validateQueryRules(rule);

      expect(issues).to.have.lengthOf(1);
      expect(issues[0].message).to.include('Value is not valid');
      expect(issues[0].path).to.deep.equal([2]);
      expect(issues[0].type).to.equal(QueryIssueTypeEnum.INVALID_FIELD_VALUE);
    });
  });
});
