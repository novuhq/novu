import { expect } from 'chai';
import { extractLiquidExpressions, isValidTemplate } from './parser-utils';

describe('extractLiquidExpressions', () => {
  it('should extract simple liquid expressions', () => {
    const template = '{{name}} {{age}}';
    const expressions = extractLiquidExpressions(template);

    expect(expressions).to.deep.equal(['{{name}}', '{{age}}']);
  });

  it('should handle expressions with filters', () => {
    const template = '{{name | upcase}} {{age | plus: 1}}';
    const expressions = extractLiquidExpressions(template);

    expect(expressions).to.deep.equal(['{{name | upcase}}', '{{age | plus: 1}}']);
  });

  it('should handle expressions with whitespace', () => {
    const template = '{{ name   }} {{   age    }}';
    const expressions = extractLiquidExpressions(template);

    expect(expressions).to.deep.equal(['{{ name   }}', '{{   age    }}']);
  });

  it('should handle expressions in HTML context', () => {
    const template = '<div>{{name}}</div><span>{{age}}</span>';
    const expressions = extractLiquidExpressions(template);

    expect(expressions).to.deep.equal(['{{name}}', '{{age}}']);
  });

  it('should return empty array for invalid inputs', () => {
    expect(extractLiquidExpressions('')).to.deep.equal([]);
    expect(extractLiquidExpressions(null as any)).to.deep.equal([]);
    expect(extractLiquidExpressions(undefined as any)).to.deep.equal([]);
    expect(extractLiquidExpressions('no expressions here')).to.deep.equal([]);
  });

  it('should handle expressions with nested properties', () => {
    const template = '{{user.name}} {{address.street.number}}';
    const expressions = extractLiquidExpressions(template);

    expect(expressions).to.deep.equal(['{{user.name}}', '{{address.street.number}}']);
  });
});

describe('isValidTemplate', () => {
  it('should return true for non-empty strings', () => {
    expect(isValidTemplate('test')).to.be.true;
    expect(isValidTemplate(' ')).to.be.true;
  });

  it('should return false for empty strings', () => {
    expect(isValidTemplate('')).to.be.false;
  });

  it('should return false for non-string values', () => {
    expect(isValidTemplate(null)).to.be.false;
    expect(isValidTemplate(undefined)).to.be.false;
    expect(isValidTemplate(123)).to.be.false;
    expect(isValidTemplate({})).to.be.false;
    expect(isValidTemplate([])).to.be.false;
  });
});
