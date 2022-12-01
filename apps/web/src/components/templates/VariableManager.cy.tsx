import { mount } from 'cypress/react';
import { useFormContext } from 'react-hook-form';
import { TestWrapper } from '../../testing';
import { VariableManager } from './VariableManager';
import { TemplateFormProvider } from './TemplateFormProvider';
import { useVariablesManager } from '../../hooks/use-variables-manager';

it('should show available variables - string', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{ name }}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - array', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#each name}} {{/each}}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
});

it('should show available variables including nested - array', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#each name}} {{nested_variable}} {{/each}}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 2);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
  cy.getByTestId('template-variable-row').contains('nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - boolean', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#if name}} {{/if}}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
});

it('should show available variables including nested - boolean', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#if name}} {{nested_variable}} {{/if}}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 2);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
  cy.getByTestId('template-variable-row').contains('nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables including deeply nested', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester
          content={
            'Hello, {{#if name}} {{nested_variable}} {{#each nested_name}} {{deeply_nested_variable}} {{/each}} {{/if}}'
          }
        />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 4);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
  cy.getByTestId('template-variable-row').contains('nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
  cy.getByTestId('template-variable-row').contains('nested_name');
  cy.getByTestId('template-variable-row').contains('array');
  cy.getByTestId('template-variable-row').contains('deeply_nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show reserved variables', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{ subscriber }}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('This variable is reserved by the system');
});

function FormTester({ content }: { content: string }) {
  const { setValue } = useFormContext();

  setValue('steps.0.template.content', content);

  return <></>;
}

function VariableManagerTester() {
  const variablesArray = useVariablesManager(0, ['content']);

  return <VariableManager index={0} variablesArray={variablesArray} />;
}
