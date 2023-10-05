import { useLayoutEffect } from 'react';
import { mount } from 'cypress/react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { TestWrapper } from '../../../testing';
import { VariableManager } from './VariableManager';
import { TemplateEditorFormProvider } from './TemplateEditorFormProvider';
import { useVariablesManager } from '../../../hooks';

it('should show available variables - string', function () {
  mount(
    <TestWrapper>
      <TemplateEditorFormProvider>
        <FormTester content={'Hello, {{ name }}'} />
        <VariableManagerTester />
      </TemplateEditorFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - array', function () {
  mount(
    <TestWrapper>
      <TemplateEditorFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#each name}} {{/each}}'} />
      </TemplateEditorFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
});

it('should show available variables including nested - array', function () {
  mount(
    <TestWrapper>
      <TemplateEditorFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#each name}} {{nested_variable}} {{/each}}'} />
      </TemplateEditorFormProvider>
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
      <TemplateEditorFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#if name}} {{/if}}'} />
      </TemplateEditorFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
});

it('should show available variables including nested - boolean', function () {
  mount(
    <TestWrapper>
      <TemplateEditorFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{#if name}} {{nested_variable}} {{/if}}'} />
      </TemplateEditorFormProvider>
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
      <TemplateEditorFormProvider>
        <VariableManagerTester />
        <FormTester
          content={
            'Hello, {{#if name}} {{nested_variable}} {{#each nested_name}} {{deeply_nested_variable}} {{/each}} {{/if}}'
          }
        />
      </TemplateEditorFormProvider>
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
      <TemplateEditorFormProvider>
        <VariableManagerTester />
        <FormTester content={'Hello, {{ subscriber }}'} />
      </TemplateEditorFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('This variable is reserved by the system');
});

function FormTester({ content }: { content: string }) {
  const { control } = useFormContext();
  const steps = useFieldArray({
    control,
    name: 'steps',
  });

  useLayoutEffect(() => {
    steps.append({ template: { content } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}

const templateFields = ['content'];

function VariableManagerTester() {
  const variablesArray = useVariablesManager(0, templateFields);

  return <VariableManager index={0} variablesArray={variablesArray} />;
}
