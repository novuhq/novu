import { expect } from 'chai';
import { extractLiquidTemplateVariables } from './liquid-parser';

describe('parseLiquidVariables', () => {
  it('should not extract variable without namespace', () => {
    const template = '{{name}} {{age}}';
    const { validVariables, invalidVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members([]);
    expect(invalidVariables).to.have.lengthOf(2);
    expect(invalidVariables[0].name).to.equal('{{name}}');
    expect(invalidVariables[1].name).to.equal('{{age}}');
  });

  it('should extract nested object paths', () => {
    const template = 'Hello {{user.profile.name}}, your address is {{user.address.street}}';
    const { validVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members(['user.profile.name', 'user.address.street']);
  });

  it('should handle multiple occurrences of the same variable', () => {
    const template = '{{user.name}} {{user.name}} {{user.name}} {{invalid..foo}} {{invalid..foo}}';
    const { validVariables, invalidVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members(['user.name']);
    expect(invalidVariables).to.have.lengthOf(1);
    expect(invalidVariables[0].name).to.equal('{{invalid..foo}}');
  });

  it('should handle mixed content with HTML and variables', () => {
    const template = '<div>Hello {{user.name}}</div><span>{{status}}</span>';
    const { validVariables, invalidVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members(['user.name']);
    expect(invalidVariables).to.have.lengthOf(1);
    expect(invalidVariables[0].name).to.equal('{{status}}');
  });

  it('should handle whitespace in template syntax', () => {
    const template = '{{ user.name          }}';
    const { validVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members(['user.name']);
  });

  it('should handle empty template string', () => {
    const template = '';
    const { validVariables, invalidVariables } = extractLiquidTemplateVariables(template);

    expect(validVariables).to.have.lengthOf(0);
    expect(invalidVariables).to.have.lengthOf(0);
  });

  it('should handle template with no variables', () => {
    const template = 'Hello World!';
    const { validVariables, invalidVariables } = extractLiquidTemplateVariables(template);

    expect(validVariables).to.have.lengthOf(0);
    expect(invalidVariables).to.have.lengthOf(0);
  });

  it('should handle special characters in variable names', () => {
    const template = '{{subscriber.special_var_1}} {{subscriber.data-point}}';
    const { validVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members(['subscriber.special_var_1', 'subscriber.data-point']);
  });

  it('should handle whitespace in between template syntax', () => {
    const template = '{{ user. name }}';
    const { validVariables } = extractLiquidTemplateVariables(template);

    expect(validVariables).to.have.lengthOf(1);
    expect(validVariables[0].name).to.equal('user.name');
  });

  it('should extract array variables from for loop syntax', () => {
    const template = '{{ payload.comments[0].author }} {{ payload.comments[1].author }}';
    const { validVariables, invalidVariables } = extractLiquidTemplateVariables(template);
    const validVariablesNames = validVariables.map((variable) => variable.name);

    expect(validVariablesNames).to.have.members(['payload.comments.0.author', 'payload.comments.1.author']);
    expect(invalidVariables).to.have.lengthOf(0);
  });

  describe('Error handling', () => {
    it('should handle invalid liquid syntax gracefully', () => {
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables(
        '{{invalid..syntax}} {{invalid2..syntax}}'
      );

      expect(validVariables).to.have.lengthOf(0);
      expect(invalidVariables).to.have.lengthOf(2);
      expect(invalidVariables[0].message).to.contain('expected "|" before filter');
      expect(invalidVariables[0].name).to.equal('{{invalid..syntax}}');
      expect(invalidVariables[1].name).to.equal('{{invalid2..syntax}}');
    });

    it('should handle invalid liquid syntax gracefully, return valid variables', () => {
      const { validVariables, invalidVariables } = extractLiquidTemplateVariables(
        '{{subscriber.name}} {{invalid..syntax}}'
      );
      const validVariablesNames = validVariables.map((variable) => variable.name);

      expect(validVariablesNames).to.have.members(['subscriber.name']);
      expect(invalidVariables[0].message).to.contain('expected "|" before filter');
      expect(invalidVariables[0].name).to.equal('{{invalid..syntax}}');
    });

    it('should handle undefined input gracefully', () => {
      expect(() => extractLiquidTemplateVariables(undefined as any)).to.not.throw();
      const { validVariables } = extractLiquidTemplateVariables(undefined as any);
      const validVariablesNames = validVariables.map((variable) => variable.name);

      expect(validVariablesNames).to.have.lengthOf(0);
    });

    it('should handle non-string input gracefully', () => {
      expect(() => extractLiquidTemplateVariables({} as any)).to.not.throw();
      const { validVariables } = extractLiquidTemplateVariables({} as any);
      const validVariablesNames = validVariables.map((variable) => variable.name);

      expect(validVariablesNames).to.have.lengthOf(0);
    });
  });
});
