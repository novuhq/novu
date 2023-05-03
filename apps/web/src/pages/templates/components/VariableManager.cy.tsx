import { useLayoutEffect } from 'react';
import { mount } from 'cypress/react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { TestWrapper } from '../../../testing';
import { VariableManager } from './VariableManager';
import { TemplateEditorFormProvider } from './TemplateEditorFormProvider';
import { useVariablesManager } from '../../../hooks';
import { BrowserRouter } from 'react-router-dom';
import { CONTEXT_PATH } from '../../../config';

it('should show available variables - string', function () {
  mount(
    <BrowserRouter basename={CONTEXT_PATH}>
      <TestWrapper>
        <TemplateEditorFormProvider>
          <FormTester content={'Hello, {{ name }}'} />
          <VariableManagerTester />
        </TemplateEditorFormProvider>
      </TestWrapper>
    </BrowserRouter>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - array', function () {
  mount(
    <BrowserRouter basename={CONTEXT_PATH}>
      <TestWrapper>
        <TemplateEditorFormProvider>
          <VariableManagerTester />
          <FormTester content={'Hello, {{#each name}} {{/each}}'} />
        </TemplateEditorFormProvider>
      </TestWrapper>
    </BrowserRouter>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
});

it('should show available variables including nested - array', function () {
  mount(
    <TestWrapper>
      <BrowserRouter basename={CONTEXT_PATH}>
        <TemplateEditorFormProvider>
          <VariableManagerTester />
          <FormTester content={'Hello, {{#each name}} {{nested_variable}} {{/each}}'} />
        </TemplateEditorFormProvider>
      </BrowserRouter>
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
      <BrowserRouter basename={CONTEXT_PATH}>
        <TemplateEditorFormProvider>
          <VariableManagerTester />
          <FormTester content={'Hello, {{#if name}} {{/if}}'} />
        </TemplateEditorFormProvider>
      </BrowserRouter>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
});

it('should show available variables including nested - boolean', function () {
  mount(
    <TestWrapper>
      <BrowserRouter basename={CONTEXT_PATH}>
        <TemplateEditorFormProvider>
          <VariableManagerTester />
          <FormTester content={'Hello, {{#if name}} {{nested_variable}} {{/if}}'} />
        </TemplateEditorFormProvider>
      </BrowserRouter>
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
      <BrowserRouter basename={CONTEXT_PATH}>
        <TemplateEditorFormProvider>
          <VariableManagerTester />
          <FormTester
            content={
              'Hello, {{#if name}} {{nested_variable}} {{#each nested_name}} {{deeply_nested_variable}} {{/each}} {{/if}}'
            }
          />
        </TemplateEditorFormProvider>
      </BrowserRouter>
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
      <BrowserRouter basename={CONTEXT_PATH}>
        <TemplateEditorFormProvider>
          <VariableManagerTester />
          <FormTester content={'Hello, {{ subscriber }}'} />
        </TemplateEditorFormProvider>
      </BrowserRouter>
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
  }, []);

  return <></>;
}

const templateFields = ['content'];

function VariableManagerTester() {
  const variablesArray = useVariablesManager(0, templateFields);

  return <VariableManager index={0} variablesArray={variablesArray} />;
}
